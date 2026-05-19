
import WordExtractor from 'word-extractor';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // API Route for Word 97-2003 extraction
  app.post('/api/extract-text-doc', async (req, res) => {
    const { base64 } = req.body;
    if (!base64) return res.status(400).json({ error: 'Missing base64 data' });
    
    try {
      const buffer = Buffer.from(base64, 'base64');
      const extractor = new WordExtractor();
      const doc = await extractor.extract(buffer);
      res.json({ text: doc.getBody() });
    } catch (error) {
      console.error('Error extracting Word 97-2003 doc:', error);
      res.status(500).json({ error: 'Failed to extract text from .doc file' });
    }
  });
  app.use(session({
    secret: process.env.SESSION_SECRET || 'ajarin-ai-secret-shhh',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
  }));

  const getRedirectUri = (req: express.Request) => {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}/api/auth/google/callback`;
  };

  const getOAuth2Client = (req: express.Request) => {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getRedirectUri(req)
    );
  };

  // Auth Routes
  app.get('/api/auth/google/url', (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Google OAuth not configured' });
    }

    const client = getOAuth2Client(req);

    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/forms',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent'
    });

    res.json({ url });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    if (typeof code !== 'string') return res.status(400).send('No code provided');

    try {
      const client = getOAuth2Client(req);
      const { tokens } = await client.getToken(code);
      
      // Store tokens in session
      (req.session as any).tokens = tokens;

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error exchanging code:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get('/api/auth/status', (req, res) => {
    const tokens = (req.session as any).tokens;
    res.json({ isAuthenticated: !!tokens });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Google Form Export Route
  app.post('/api/export/gform', async (req, res) => {
    const tokens = (req.session as any).tokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { subject, questions, config } = req.body;
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Missing questions' });
    }

    const rawSubject = (typeof subject === 'string' && subject.trim()) ? subject.trim() : 'Untitled Quiz';
    const finalSubject = rawSubject.replace(/\n|\r/g, ' ').substring(0, 200);

    try {
      const client = getOAuth2Client(req);
      client.setCredentials(tokens);
      const forms = google.forms({ version: 'v1', auth: client });

      // 1. Create a new form
      const createResponse = await forms.forms.create({
        requestBody: {
          info: {
            title: finalSubject,
            documentTitle: finalSubject,
          }
        }
      });

      const formId = createResponse.data.formId;
      if (!formId) throw new Error('Failed to create form');

      // 2. Prepare updates (Set as Quiz + Identity fields + Questions)
      const requests: any[] = [
        {
          updateSettings: {
            settings: {
              quizSettings: { isQuiz: true }
            },
            updateMask: 'quizSettings.isQuiz'
          }
        }
      ];

      let currentIndex = 0;

      // Identity fields
      if (config.includeName) {
        requests.push({
          createItem: {
            item: {
              title: 'Nama Lengkap',
              questionItem: {
                question: { required: true, textQuestion: {} }
              }
            },
            location: { index: currentIndex++ }
          }
        });
      }
      if (config.includeClass) {
        requests.push({
          createItem: {
            item: {
              title: 'Kelas',
              questionItem: {
                question: { required: true, textQuestion: {} }
              }
            },
            location: { index: currentIndex++ }
          }
        });
      }
      if (config.includeAbsentNo) {
        requests.push({
          createItem: {
            item: {
              title: 'Nomor Absen',
              questionItem: {
                question: { required: true, textQuestion: {} }
              }
            },
            location: { index: currentIndex++ }
          }
        });
      }

      // Add Questions
      questions.forEach((q: any, idx: number) => {
        const isMC = q.pilihan && q.pilihan.length > 0;
        const qTitle = `${idx + 1}. ${q.pertanyaan || ''}`;
        
        if (isMC) {
          const correctIndex = q.pilihan.findIndex((opt: string) => {
            return q.jawaban_benar && (opt === q.jawaban_benar || opt.replace(/^[A-Ea-e]\.\s*/, '') === q.jawaban_benar.replace(/^[A-Ea-e]\.\s*/, ''));
          });

          const options = q.pilihan.map((opt: string, optIdx: number) => {
            const letter = String.fromCharCode(97 + optIdx);
            const cleanOption = opt ? opt.replace(/^[A-Ea-e]\.\s*/, '') : '';
            return { value: `${letter}. ${cleanOption}` };
          });

          const prefixedCorrectAnswer = correctIndex !== -1 
            ? `${String.fromCharCode(97 + correctIndex)}. ${q.pilihan[correctIndex].replace(/^[A-Ea-e]\.\s*/, '')}`
            : q.jawaban_benar;
          
          requests.push({
            createItem: {
              item: {
                title: qTitle,
                questionItem: {
                  question: {
                    required: true,
                    grading: {
                      pointValue: config.mcPoints || 0,
                      correctAnswers: {
                        answers: [{ value: prefixedCorrectAnswer || '' }]
                      }
                    },
                    choiceQuestion: {
                      type: 'RADIO',
                      options: options
                    }
                  }
                }
              },
              location: { index: currentIndex++ }
            }
          });
        } else {
          requests.push({
            createItem: {
              item: {
                title: qTitle,
                questionItem: {
                  question: {
                    required: true,
                    grading: {
                      pointValue: config.essayPoints || 0
                    },
                    textQuestion: { paragraph: true }
                  }
                }
              },
              location: { index: currentIndex++ }
            }
          });
        }
      });

      // Execute batch update
      await forms.forms.batchUpdate({
        formId,
        requestBody: { requests }
      });

      res.json({ 
        success: true, 
        formUrl: createResponse.data.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`,
        editUrl: `https://docs.google.com/forms/d/${formId}/edit`
      });

    } catch (error) {
      console.error('Error creating Google Form:', error);
      res.status(500).json({ error: 'Failed to create Google Form: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Vite preview configuration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
