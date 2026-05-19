
export enum Difficulty {
  Easy = 'mudah',
  Medium = 'sedang',
  Hard = 'sukar',
}

export enum QuestionType {
  MultipleChoice = 'pilihan ganda',
  Essay = 'esai',
}

export interface Question {
  id: string;
  nomor: number;
  pertanyaan: string;
  tipe: QuestionType;
  pilihan?: string[];
  jawaban_benar?: string;
  jawaban_esai?: string;
  langkah_langkah_jawaban?: string;
  image_prompt?: string; // New: Description for generating an image
  image_url?: string;    // New: The generated base64 image
}

export interface ExtractedQuizData {
  title: string;
  questions: Question[];
}

export interface TeacherNote {
  pertemuan: number;
  materi: string;
  catatan: string[];
}

export interface SpecializedLKPD {
  id: string;
  judul: string;
  identitas: {
    mataPelajaran: string;
    kelasSemester: string;
    topik: string;
    alokasiWaktu: string;
  };
  tujuanPembelajaran: string[];
  materiSingkat: string;
  langkahKegiatan: {
    tahap: string;
    instruksi: string;
    imagePrompt?: string; // For generating fun illustrations for kids
    imageUrl?: string;
  }[];
  pertanyaanDiskusi: string[];
  kesimpulan: string;
}

export interface LessonPlan {
  id: string;
  teacherNotes?: TeacherNote[]; // New: Optional teacher notes generated later
  specializedLKPD?: SpecializedLKPD; // New: Optional specialized LKPD generated later
  informasiUmum: {
    identitasModul: {
      namaPenyusun: string;
      satuanPendidikan: string;
      faseKelas: string;
      mataPelajaran: string;
      alokasiWaktu: string;
      tahunPenyusunan: string;
    };
    kompetensiAwal: string;
    profilPelajarPancasila: string[];
    saranaPrasarana: string[];
    targetPesertaDidik: string;
    modelPembelajaran: string;
  };
  komponenInti: {
    tujuanPembelajaran: string[];
    pemahamanBermakna: string[];
    pertanyaanPemantik: string[];
    kegiatanPembelajaran: {
        pertemuan: number;
        materi: string;
        pendahuluan: string[];
        inti: string[];
        penutup: string[];
    }[];
  };
  asesmenPenilaian: {
    sikap: string;
    pengetahuan: string;
    keterampilan: string;
  };
  pengayaanRemedial: {
    pengayaan: string;
    remedial: string;
  };
  refleksi: {
    guru: string[];
    siswa: string[];
  };
  lampiran: {
    lkpd: {
        judul: string;
        petunjuk: string[];
        tugas: string[];
    }[];
    bahanBacaan: {
        judul: string;
        konten: string;
    }[];
    glosarium: { istilah: string; definisi: string }[];
    daftarPustaka: string[];
  };
}

declare global {
  interface Window {
    MathJax: {
      typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
    };
  }
}
