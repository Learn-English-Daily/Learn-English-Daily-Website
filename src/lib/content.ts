import {
  Award,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Headphones,
  HeartHandshake,
  Languages,
  MessageCircle,
  Mic,
  PenTool,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Video
} from "lucide-react";

export type Locale = "en" | "id";
export const locales: Locale[] = ["en", "id"];

export const iconMap = {
  Award,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Headphones,
  HeartHandshake,
  Languages,
  MessageCircle,
  Mic,
  PenTool,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Video
};

export const sharedContent = {
  socials: [
    {
      name: "Instagram",
      url: "https://www.instagram.com/learnenglishdaily_2026?igsh=cjN2aXd3ODN5dXUw"
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com/profile.php?id=61589425052642"
    },
    {
      name: "TikTok",
      url: "https://www.tiktok.com/@learn.english.daily.1?_r=1&_t=ZS-96ZIuehHDJU"
    }
  ],
  stats: [
    { value: 1000, suffix: "+", icon: "Users" },
    { value: 50, suffix: "+", icon: "BookOpen" },
    { value: 20, suffix: "+", icon: "GraduationCap" },
    { value: 95, suffix: "%", icon: "Star" }
  ],
  teachers: [
    {
      name: "Ms. Eva Yulia",
      qualification: "BS, Islamic Education",
      experience: "6 years",
      specialization: "Life is an endless journey. Embrace each chapter with hope and gratitude.",
      initials: "EY",
      accent: "blue"
    },
    {
      name: "Ms. Nila Niswah",
      qualification: "BS, Islamic Education",
      experience: "10 years",
      specialization: "The world becomes a classroom when we never stop being curious",
      initials: "NN",
      accent: "yellow"
    },
    {
      name: "Ms. AlFiana Sa'ban ",
      qualification: "BS, English Education",
      experience: "1 years",
      specialization: "Don't stop being yourself just because others don't get it",
      initials: "AS",
      accent: "green"
    }
  ],
  testimonials: [
    {
      name: "Aisha Khan",
      country: "Pakistan",
      photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Rizky Pratama",
      country: "Indonesia",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Maria Santos",
      country: "Philippines",
      photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80"
    }
  ]
} as const;

export const content = {
  en: {
    meta: {
      title: "LEAD | Online English Classes for Confident Speaking",
      description:
        "Join LEAD online English academy for live speaking, grammar, IELTS, business English, and confidence-building classes with expert teachers."
    },
    nav: ["Home", "Courses", "About Us", "Teachers", "Testimonials", "Blog", "FAQ", "Contact"],
    cta: {
      trial: "Book Free Trial",
      courses: "View Courses",
      learn: "Learn More",
      enroll: "Enroll Now",
      whatsapp: "WhatsApp Us",
      submit: "Send Message",
      download: "Download Free PDF"
    },
    hero: {
      eyebrow: "Live online English academy",
      title: "Speak English Confidently and Lead Your Future",
      subtitle:
        "Join live online classes designed to help students improve speaking, grammar, vocabulary, pronunciation, and confidence.",
      trust: ["Live Interactive Classes", "Certified Teachers", "Flexible Schedules", "Affordable Fees"],
      note: "Join students from around the world who are improving their English with LEAD."
    },
    why: {
      eyebrow: "Why choose LEAD",
      title: "Practical English learning that feels supportive, structured, and real.",
      items: [
        ["Expert Teachers", "Learn with certified instructors who make every lesson clear and motivating.", "Award"],
        ["Practical Lessons", "Practice real conversations for school, work, interviews, and daily life.", "Mic"],
        ["Small Group Classes", "Get more speaking time, attention, and confidence in every session.", "Users"],
        ["Personalized Feedback", "Receive simple, actionable feedback so you know exactly what to improve.", "ClipboardCheck"],
        ["Flexible Timings", "Choose class schedules that fit studies, work, and family life.", "Clock"],
        ["Affordable Pricing", "Access premium learning support without heavy fees.", "ShieldCheck"]
      ]
    },
    coursesTitle: "Courses for every goal and level",
    coursesIntro: "Choose focused programs for speaking, grammar, IELTS, business, school success, and kids.",
    courses: [
      ["Spoken English for Beginners", "Build basic fluency, sentence confidence, and everyday conversation skills.", "8 weeks", "Beginner", "Mic"],
      ["Elementary English", "Strengthen core grammar, reading, writing, and speaking foundations.", "10 weeks", "Elementary", "BookOpen"],
      ["High School English Program", "Improve academic English, comprehension, assignments, and exam readiness.", "12 weeks", "School", "GraduationCap"],
      ["Grammar Mastery", "Learn grammar patterns through examples, practice, and correction.", "6 weeks", "All levels", "PenTool"],
      ["Vocabulary Building", "Expand useful vocabulary for daily life, study, and professional communication.", "6 weeks", "All levels", "Languages"],
      ["Speech Competition Prep", "Learn to write, practice, and deliver confident speeches for school competitions.", "8 weeks", "Intermediate", "Target"],
      ["Business English", "Communicate clearly in meetings, emails, presentations, and interviews.", "8 weeks", "Professional", "BriefcaseBusiness"],
      ["Kids English Program", "Fun, interactive English lessons for young learners.", "10 weeks", "Kids", "Sparkles"]
    ],
    levels: {
      title: "A clear path from basics to confident communication",
      items: [
        ["Beginner", "Introduce yourself, ask simple questions, and use everyday phrases."],
        ["Elementary", "Build accurate sentences, common vocabulary, and listening confidence."],
        ["Intermediate", "Speak longer, explain opinions, and handle real-life situations."],
        ["Upper Intermediate", "Refine fluency, pronunciation, grammar, and academic expression."],
        ["Advanced", "Lead discussions, present ideas, and communicate professionally."]
      ]
    },
    process: [
      ["Book a Free Trial", "Tell us your goals and schedule a friendly first class.", "CalendarCheck"],
      ["Take Placement Test", "We check your level and recommend the right learning path.", "ClipboardCheck"],
      ["Join Live Classes", "Practice with expert teachers and supportive classmates.", "Video"],
      ["Track Progress", "See your improvement through feedback, milestones, and reports.", "BarChart3"]
    ],
    teachersTitle: "Meet our teachers",
    testimonialsTitle: "Students are speaking with more confidence",
    feedback: [
      "LEAD helped me stop translating in my head. I can now speak during meetings with much more confidence.",
      "The classes are friendly and practical. My teacher corrected my mistakes without making me nervous.",
      "I improved my IELTS speaking score and learned how to organize answers naturally."
    ],
    statLabels: ["Students Trained", "Courses", "Expert Teachers", "Satisfaction Rate"],
    resources: [
      ["Daily Vocabulary", "Fresh words with examples you can use today.", "Languages"],
      ["Grammar Tips", "Simple explanations for common grammar problems.", "PenTool"],
      ["Speaking Practice", "Prompts and drills to build speaking confidence.", "MessageCircle"],
      ["Free Worksheets", "Printable practice sheets for self-study.", "FileText"],
      ["Blog Articles", "Helpful guidance for study, careers, and IELTS.", "BookOpen"]
    ],
    pricing: [
      ["Basic", "For steady group learning", "$29/mo", ["Group Classes", "Weekly Assignments", "Community Support"]],
      ["Standard", "Most Popular", "$49/mo", ["Group Classes", "Practice Sessions", "Teacher Feedback", "Progress Reports"]],
      ["Premium", "For personal coaching", "$99/mo", ["One-to-One Coaching", "Personalized Plan", "Priority Support", "Certificate Guidance"]]
    ],
    faq: [
      ["Who can join LEAD?", "School students, university students, job seekers, professionals, homemakers, IELTS learners, and anyone who wants better English can join."],
      ["Are classes live?", "Yes. Classes are live, interactive, and guided by teachers so you can practice speaking in real time."],
      ["Do you provide certificates?", "Yes. Eligible students receive completion certificates after finishing their program requirements."],
      ["How long is each class?", "Most classes are 45 to 60 minutes, depending on the course and learning plan."],
      ["What payment methods do you accept?", "We can support bank transfer, digital wallet, and online payment options depending on your country."],
      ["Can I book a free trial?", "Yes. Use the free trial form or WhatsApp button and our team will help schedule your class."]
    ],
    contact: {
      title: "Book your free trial class",
      subtitle: "Share your goals and our team will help you choose the right English program.",
      fields: ["Full name", "Email address", "WhatsApp number", "Learning goal"],
      success: "Thank you. Your request has been received."
    },
    finalCta: {
      title: "Ready to Transform Your English?",
      subtitle: "Book your free trial class today and start speaking confidently."
    },
    pages: {
      about: "LEAD was created to make high-quality English learning practical, friendly, and accessible from anywhere.",
      blog: "Read short, useful English learning articles for vocabulary, grammar, pronunciation, IELTS, and career communication.",
      privacy: "We collect only the information needed to respond to inquiries, deliver learning services, and improve the student experience.",
      terms: "By enrolling in LEAD programs, students agree to respectful participation, timely payment, and fair use of learning materials."
    },
    footer: "© 2026 LEAD (Learn English Daily). All rights reserved."
  },
  id: {
    meta: {
      title: "LEAD | Kelas Bahasa Inggris Online untuk Percaya Diri Berbicara",
      description:
        "Ikuti akademi bahasa Inggris online LEAD untuk speaking, grammar, IELTS, business English, dan kelas percaya diri bersama guru ahli."
    },
    nav: ["Beranda", "Kursus", "Tentang Kami", "Guru", "Testimoni", "Blog", "FAQ", "Kontak"],
    cta: {
      trial: "Coba Kelas Gratis",
      courses: "Lihat Kursus",
      learn: "Pelajari",
      enroll: "Daftar Sekarang",
      whatsapp: "Chat WhatsApp",
      submit: "Kirim Pesan",
      download: "Unduh PDF Gratis"
    },
    hero: {
      eyebrow: "Akademi bahasa Inggris online live",
      title: "Berbicara Bahasa Inggris dengan Percaya Diri dan Pimpin Masa Depanmu",
      subtitle:
        "Ikuti kelas online live untuk meningkatkan speaking, grammar, vocabulary, pronunciation, dan rasa percaya diri.",
      trust: ["Kelas Live Interaktif", "Guru Bersertifikat", "Jadwal Fleksibel", "Biaya Terjangkau"],
      note: "Bergabung dengan siswa dari berbagai negara yang meningkatkan bahasa Inggris bersama LEAD."
    },
    why: {
      eyebrow: "Mengapa memilih LEAD",
      title: "Belajar bahasa Inggris praktis yang terasa suportif, terarah, dan nyata.",
      items: [
        ["Guru Ahli", "Belajar dengan instruktur bersertifikat yang membuat setiap pelajaran jelas dan memotivasi.", "Award"],
        ["Pelajaran Praktis", "Latih percakapan nyata untuk sekolah, kerja, wawancara, dan kehidupan sehari-hari.", "Mic"],
        ["Kelas Grup Kecil", "Dapatkan lebih banyak waktu speaking, perhatian, dan kepercayaan diri.", "Users"],
        ["Feedback Personal", "Terima masukan sederhana dan jelas agar tahu apa yang harus diperbaiki.", "ClipboardCheck"],
        ["Waktu Fleksibel", "Pilih jadwal kelas yang cocok untuk belajar, bekerja, dan keluarga.", "Clock"],
        ["Harga Terjangkau", "Akses pembelajaran premium tanpa biaya berat.", "ShieldCheck"]
      ]
    },
    coursesTitle: "Kursus untuk setiap tujuan dan level",
    coursesIntro: "Pilih program untuk speaking, grammar, IELTS, bisnis, sekolah, dan anak-anak.",
    courses: [
      ["Spoken English untuk Pemula", "Bangun kefasihan dasar, percaya diri membuat kalimat, dan percakapan harian.", "8 minggu", "Pemula", "Mic"],
      ["Elementary English", "Perkuat grammar, reading, writing, dan speaking dasar.", "10 minggu", "Dasar", "BookOpen"],
      ["Program Bahasa Inggris SMA", "Tingkatkan English akademik, pemahaman, tugas, dan kesiapan ujian.", "12 minggu", "Sekolah", "GraduationCap"],
      ["Grammar Mastery", "Pelajari pola grammar melalui contoh, latihan, dan koreksi.", "6 minggu", "Semua level", "PenTool"],
      ["Vocabulary Building", "Perluas vocabulary untuk kehidupan sehari-hari, studi, dan komunikasi profesional.", "6 minggu", "Semua level", "Languages"],
      ["Persiapan Lomba Pidato", "Belajar menulis, berlatih, dan membawakan pidato percaya diri untuk lomba sekolah.", "8 minggu", "Menengah", "Target"],
      ["Business English", "Berkomunikasi jelas dalam meeting, email, presentasi, dan wawancara.", "8 minggu", "Profesional", "BriefcaseBusiness"],
      ["Kids English Program", "Pelajaran bahasa Inggris seru dan interaktif untuk anak-anak.", "10 minggu", "Anak-anak", "Sparkles"]
    ],
    levels: {
      title: "Jalur jelas dari dasar hingga komunikasi percaya diri",
      items: [
        ["Beginner", "Memperkenalkan diri, bertanya sederhana, dan memakai frasa harian."],
        ["Elementary", "Membangun kalimat tepat, vocabulary umum, dan percaya diri listening."],
        ["Intermediate", "Berbicara lebih panjang, menyampaikan opini, dan menghadapi situasi nyata."],
        ["Upper Intermediate", "Menyempurnakan fluency, pronunciation, grammar, dan ekspresi akademik."],
        ["Advanced", "Memimpin diskusi, mempresentasikan ide, dan berkomunikasi profesional."]
      ]
    },
    process: [
      ["Coba Kelas Gratis", "Ceritakan tujuanmu dan jadwalkan kelas pertama yang ramah.", "CalendarCheck"],
      ["Ikuti Tes Level", "Kami mengecek level dan merekomendasikan jalur belajar terbaik.", "ClipboardCheck"],
      ["Masuk Kelas Live", "Berlatih dengan guru ahli dan teman kelas yang suportif.", "Video"],
      ["Pantau Progres", "Lihat peningkatan melalui feedback, milestone, dan laporan.", "BarChart3"]
    ],
    teachersTitle: "Kenali guru kami",
    testimonialsTitle: "Siswa berbicara dengan lebih percaya diri",
    feedback: [
      "LEAD membantu saya berhenti menerjemahkan di kepala. Sekarang saya lebih percaya diri saat meeting.",
      "Kelasnya ramah dan praktis. Guru mengoreksi kesalahan saya tanpa membuat saya gugup.",
      "Skor IELTS speaking saya naik dan saya belajar menyusun jawaban dengan natural."
    ],
    statLabels: ["Siswa Dilatih", "Kursus", "Guru Ahli", "Tingkat Kepuasan"],
    resources: [
      ["Daily Vocabulary", "Kata baru dengan contoh yang bisa dipakai hari ini.", "Languages"],
      ["Tips Grammar", "Penjelasan sederhana untuk masalah grammar umum.", "PenTool"],
      ["Latihan Speaking", "Prompt dan drill untuk membangun percaya diri berbicara.", "MessageCircle"],
      ["Worksheet Gratis", "Lembar latihan cetak untuk belajar mandiri.", "FileText"],
      ["Artikel Blog", "Panduan belajar, karier, dan IELTS yang bermanfaat.", "BookOpen"]
    ],
    pricing: [
      ["Basic", "Untuk belajar grup rutin", "$29/bln", ["Kelas Grup", "Tugas Mingguan", "Dukungan Komunitas"]],
      ["Standard", "Paling Populer", "$49/bln", ["Kelas Grup", "Sesi Praktik", "Feedback Guru", "Laporan Progres"]],
      ["Premium", "Untuk coaching personal", "$99/bln", ["Coaching 1:1", "Rencana Personal", "Prioritas Support", "Panduan Sertifikat"]]
    ],
    faq: [
      ["Siapa yang bisa bergabung dengan LEAD?", "Siswa sekolah, mahasiswa, pencari kerja, profesional, ibu rumah tangga, peserta IELTS, dan siapa pun yang ingin meningkatkan bahasa Inggris."],
      ["Apakah kelasnya live?", "Ya. Kelas berlangsung live, interaktif, dan dipandu guru agar kamu bisa latihan speaking secara langsung."],
      ["Apakah ada sertifikat?", "Ya. Siswa yang memenuhi syarat akan menerima sertifikat setelah menyelesaikan program."],
      ["Berapa lama setiap kelas?", "Sebagian besar kelas berdurasi 45 sampai 60 menit, tergantung kursus dan rencana belajar."],
      ["Metode pembayaran apa yang tersedia?", "Kami dapat mendukung transfer bank, dompet digital, dan pembayaran online sesuai negara kamu."],
      ["Bisakah saya mencoba kelas gratis?", "Ya. Gunakan formulir trial gratis atau tombol WhatsApp dan tim kami akan membantu menjadwalkan kelas."]
    ],
    contact: {
      title: "Pesan kelas trial gratis",
      subtitle: "Bagikan tujuanmu dan tim kami akan membantu memilih program bahasa Inggris yang tepat.",
      fields: ["Nama lengkap", "Alamat email", "Nomor WhatsApp", "Tujuan belajar"],
      success: "Terima kasih. Permintaanmu sudah kami terima."
    },
    finalCta: {
      title: "Siap Mengubah Bahasa Inggrismu?",
      subtitle: "Pesan kelas trial gratis hari ini dan mulai berbicara dengan percaya diri."
    },
    pages: {
      about: "LEAD dibuat untuk menjadikan pembelajaran bahasa Inggris berkualitas tinggi lebih praktis, ramah, dan bisa diakses dari mana saja.",
      blog: "Baca artikel singkat dan berguna tentang vocabulary, grammar, pronunciation, IELTS, dan komunikasi karier.",
      privacy: "Kami hanya mengumpulkan informasi yang diperlukan untuk menjawab pertanyaan, memberikan layanan belajar, dan meningkatkan pengalaman siswa.",
      terms: "Dengan mengikuti program LEAD, siswa setuju untuk berpartisipasi dengan hormat, membayar tepat waktu, dan menggunakan materi belajar secara wajar."
    },
    footer: "© 2026 LEAD (Learn English Daily). Semua hak dilindungi."
  }
} as const;

export type SiteContent = (typeof content)[Locale];
