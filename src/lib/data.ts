import { PlaceHolderImages } from './placeholder-images';

export type Vaccine = {
  name: string;
  dose: string;
  date: string;
  status: 'Completed' | 'Upcoming';
};

export type FamilyMember = {
  id: string;
  name:string;
  birthdate: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  relationship: string;
  phone: string;
  email: string;
  isFullyVaccinated: boolean;
  nextDose: {
    vaccine: string;
    date: string;
  } | null;
  avatarUrl: string;
  vaccineHistory: Vaccine[];
  linkedAccountEmail?: string; // Email of the registered account (for family grouping)
  familyGroupId?: string; // ID to group family members together
  createdAt?: string; // Timestamp when the patient was added
};

export type Notification = {
  id: string;
  memberName: string;
  message: string;
  date: string;
  type: 'Upcoming' | 'Completed' | 'Info';
};

export const familyMembers: FamilyMember[] = [
  {
    id: 'user-jessica',
    name: 'Jessica Doe',
    birthdate: '1990-01-01',
    age: 35,
    gender: 'Female',
    relationship: 'Me',
    phone: '111-222-3333',
    email: 'jessica@example.com',
    isFullyVaccinated: true,
    nextDose: null,
    avatarUrl: 'https://images.unsplash.com/photo-1598625873873-52f9aefd7d9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHx3b21hbiUyMHNtaWxpbmd8ZW58MHx8fHwxNzYyODY1MTk3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    vaccineHistory: [
      {
        name: 'COVID-19',
        dose: '3',
        date: '2024-09-15',
        status: 'Completed',
      },
      {
        name: 'Influenza',
        dose: '1',
        date: '2024-10-01',
        status: 'Completed',
      },
    ],
  },
  {
    id: 'sample-julian',
    name: 'Julian Doe',
    birthdate: '2017-03-15',
    age: 8,
    gender: 'Male',
    relationship: 'Son',
    phone: '555-0101',
    email: 'julian@example.com',
    isFullyVaccinated: false,
    nextDose: {
      vaccine: 'MMR Dose 2',
      date: '2025-12-15',
    },
    avatarUrl: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=200',
    vaccineHistory: [
      {
        name: 'DTaP',
        dose: '5',
        date: '2023-08-20',
        status: 'Completed',
      },
      {
        name: 'MMR',
        dose: '1',
        date: '2023-06-10',
        status: 'Completed',
      },
      {
        name: 'MMR',
        dose: '2',
        date: '2025-12-15',
        status: 'Upcoming',
      },
      {
        name: 'Influenza',
        dose: '1',
        date: '2025-12-20',
        status: 'Upcoming',
      },
    ],
  },
  {
    id: 'sample-elena',
    name: 'Elena Doe',
    birthdate: '2020-07-22',
    age: 5,
    gender: 'Female',
    relationship: 'Daughter',
    phone: '555-0102',
    email: 'elena@example.com',
    isFullyVaccinated: false,
    nextDose: {
      vaccine: 'DTaP Dose 4',
      date: '2025-12-10',
    },
    avatarUrl: 'https://images.unsplash.com/photo-1592621385612-4d7129426394?w=200',
    vaccineHistory: [
      {
        name: 'Hepatitis B',
        dose: '3',
        date: '2024-02-15',
        status: 'Completed',
      },
      {
        name: 'DTaP',
        dose: '4',
        date: '2025-12-10',
        status: 'Upcoming',
      },
      {
        name: 'Varicella',
        dose: '1',
        date: '2025-12-25',
        status: 'Upcoming',
      },
    ],
  },
  {
    id: 'sample-ryan',
    name: 'Ryan Doe',
    birthdate: '2023-01-10',
    age: 2,
    gender: 'Male',
    relationship: 'Son',
    phone: '555-0103',
    email: 'ryan@example.com',
    isFullyVaccinated: false,
    nextDose: {
      vaccine: 'MMR Dose 1',
      date: '2026-01-10',
    },
    avatarUrl: 'https://images.unsplash.com/photo-1552788960-65fcafe071a5?w=200',
    vaccineHistory: [
      {
        name: 'Hepatitis B',
        dose: '1',
        date: '2023-01-11',
        status: 'Completed',
      },
      {
        name: 'DTaP',
        dose: '1',
        date: '2023-03-10',
        status: 'Completed',
      },
      {
        name: 'DTaP',
        dose: '2',
        date: '2023-05-10',
        status: 'Completed',
      },
      {
        name: 'MMR',
        dose: '1',
        date: '2026-01-10',
        status: 'Upcoming',
      },
    ],
  },
];

export const notifications: Notification[] = [
  {
    id: 'notif-1',
    memberName: 'Elena Doe',
    message: 'DTaP Dose 4 is scheduled',
    date: '2025-12-10',
    type: 'Upcoming',
  },
  {
    id: 'notif-2',
    memberName: 'Julian Doe',
    message: 'MMR Dose 2 is scheduled',
    date: '2025-12-15',
    type: 'Upcoming',
  },
  {
    id: 'notif-3',
    memberName: 'Julian Doe',
    message: 'Influenza Dose 1 is scheduled',
    date: '2025-12-20',
    type: 'Upcoming',
  },
];

export const vaccinesInfo = [
    {
        name: 'DTaP (Diphtheria, Tetanus, and Acellular Pertussis)',
        description: 'Protects against diphtheria, tetanus (lockjaw), and whooping cough (pertussis). Given in a series of 5 doses for children.'
    },
    {
        name: 'MMR (Measles, Mumps, and Rubella)',
        description: 'Protects against measles, mumps, and rubella. Typically given in two doses, one at 12-15 months and another at 4-6 years.'
    },
    {
        name: 'Hepatitis B',
        description: 'Protects against Hepatitis B virus, which can cause liver disease. The series is typically started at birth.'
    },
    {
        name: 'Varicella (Chickenpox)',
        description: 'Protects against chickenpox, a common and very contagious childhood disease. Given in two doses.'
    },
    {
        name: 'Influenza (Flu Shot)',
        description: 'Protects against seasonal influenza viruses. Recommended annually for everyone 6 months of age and older.'
    },
    {
        name: 'IPV (Inactivated Poliovirus)',
        description: 'Protects against polio, a crippling and potentially deadly infectious disease. Given in a four-dose series in childhood.'
    },
    {
        name: 'Hib (Haemophilus influenzae type b)',
        description: 'Protects against Haemophilus influenzae type b, a bacteria that can cause meningitis, pneumonia, and epiglottitis. Given in a 3 or 4-dose series.'
    },
    {
        name: 'PCV13 (Pneumococcal Conjugate Vaccine)',
        description: 'Protects against pneumococcal disease, which can cause ear infections, pneumonia, and meningitis. Given in a 4-dose series to infants.'
    },
    {
        name: 'Hepatitis A',
        description: 'Protects against Hepatitis A, a liver disease spread through contaminated food or water. Given in a two-dose series.'
    },
    {
        name: 'HPV (Human Papillomavirus)',
        description: 'Protects against human papillomavirus, which can cause several types of cancer. Recommended for preteens, with a 2 or 3-dose series.'
    },
    {
        name: 'Rotavirus',
        description: 'Protects against rotavirus, which causes severe diarrhea, vomiting, and fever in infants and young children. It is an oral vaccine given in 2 or 3 doses.'
    },
    {
        name: 'Meningococcal',
        description: 'Protects against meningococcal disease, a serious bacterial illness. Recommended for preteens and teens in two doses, plus boosters for those at increased risk.'
    },
    {
        name: 'Tdap (Tetanus, Diphtheria, and Acellular Pertussis)',
        description: 'A booster shot for preteens, teens, and adults to protect against tetanus, diphtheria, and pertussis. Also recommended during each pregnancy.'
    },
    {
        name: 'Shingles (Zoster)',
        description: 'Protects against shingles, a painful rash caused by the same virus as chickenpox. Recommended for adults 50 years and older in a two-dose series.'
    },
    {
        name: 'COVID-19',
        description: 'Protects against SARS-CoV-2, the virus that causes COVID-19. Multiple doses and boosters are recommended to maintain protection against severe illness.'
    },
    {
        name: 'Typhoid',
        description: 'Protects against typhoid fever, a life-threatening illness. Recommended for travelers to certain parts of the world where typhoid fever is common.'
    }
]
