// interface SignatureProps {
//   className?: string;
// }

// /** Hand-drawn style "JJ" autograph mark used in the editorial hero. */
// export default function Signature({ className }: SignatureProps) {
//   return (

//     <svg
//       viewBox="0 0 220 110"
//       role="img"
//       aria-label="Humai signature"
//       className={className}
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//     >
//       <path
//         d="M18 82C34 54 44 30 50 24c5-5 9 1 7 12-3 15-9 34-14 44-4 8 2 10 12 4 12-7 26-22 33-38 4-9 6-16 4-16-3 0-8 9-12 20-5 13-8 28-6 34 2 7 12 6 22-2"
//         stroke="currentColor"
//         strokeWidth="4.5"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//       <path
//         d="M104 62c14-16 26-28 33-30 6-2 8 4 4 12-6 13-18 30-27 40-6 7-4 11 4 10 12-2 28-18 38-34"
//         stroke="currentColor"
//         strokeWidth="4.5"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//       <path
//         d="M152 30c10 6 22 16 32 26M182 22c-6 12-12 26-16 38"
//         stroke="currentColor"
//         strokeWidth="4.5"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//       <path
//         d="M120 92c22 6 48 4 68-6"
//         stroke="currentColor"
//         strokeWidth="4.5"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//         opacity="0.8"
//       />
//     </svg>
//   );
// }
interface SignatureProps {
  className?: string;
  /** Teks aksesibilitas untuk screen reader */
  label?: string;
}

/** Hand-drawn style autograph mark used in the editorial hero. */
export default function Signature({ className, label = "Signature" }: SignatureProps) {
  return (
    <svg viewBox='175 195 635 855' role='img' aria-label={label} className={className} fill='none' xmlns='http://www.w3.org/2000/svg'>
      <g stroke='currentColor' strokeWidth={14} strokeLinecap='round' strokeLinejoin='round'>
        {/* Loop atas + goresan miring ke kiri bawah + lengkung besar ke kanan */}
        <path
          d='M 470 372
             C 490 320, 530 245, 546 222
             C 556 212, 558 228, 545 252
             C 520 300, 490 350, 466 388
             C 400 450, 300 560, 262 636
             C 256 646, 270 646, 285 636
             C 340 598, 400 552, 470 508
             C 560 452, 660 405, 730 400
             C 775 398, 792 425, 776 460
             C 745 520, 640 590, 570 645
             C 520 688, 480 725, 445 752'
        />

        {/* Goresan vertikal panjang */}
        <path
          d='M 466 388
             C 440 450, 425 520, 420 600
             C 415 700, 415 800, 425 880
             C 435 960, 445 1030, 458 1034
             C 470 1030, 468 900, 465 760'
        />

        {/* Garis diagonal dari kiri bawah + kait kecil */}
        <path
          d='M 190 950
             C 280 885, 380 815, 470 755
             C 500 735, 520 720, 545 718
             C 560 718, 565 745, 575 780
             L 596 752'
        />
      </g>
    </svg>
  );
}
