'use client';
import { useRouter } from 'next/navigation';

function BackButton({
  children,
}: React.PropsWithChildren<{
  className?: string;
}>) {
  const router = useRouter();
  return (
    <button className={`
    text-xs
    w-[25%] 
    md:w-[25%] 
    lg:w-[25%] 
    xl:w-[25%] 
    sm:w-[25%] 
    font-['Montserrat']
    text-tunnel-snake-green 
    bg-tunnel-snake-black 
    hover:bg-tunnel-snake-green 
    hover:text-tunnel-snake-black
    rounded-sm 
    border 
    border-tunnel-snake-green
    py-2 px-4 
    `} onClick={() => router.back()}>
      {children}
    </button>
  );
}

export default BackButton;