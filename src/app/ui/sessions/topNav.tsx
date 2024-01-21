import Image from "next/image";
import Link from "next/link";

export default function TopNav() {
  return (
    <div className="w-full bg-tunnel-snake-black py-5 space-items items-center gap-5 flex-row inline-flex ">
      <div className="justify-center items-center gap-2 flex pl-5">
        <Image
          src="/Menu.svg"
          alt={"Nav menu button"}
          width={20}
          height={20}
        />
        <div className="text-white text-xl font-medium font-['Montserrat']">
          Menu
        </div>
      </div>
      <div className="grow shrink basis-0 h-14 pr-5 justify-center items-center gap-5 flex ">
        <div className="text-white text-5xl font-bold font-['Montserrat'] ">
          🐍
        </div>
        <Link className="text-white text-5xl font-bold font-['Montserrat'] " href={"/sessions/"}>
          Tunnel Snakes Rule
        </Link>
        <div className="text-white text-5xl font-bold font-['Montserrat'] ">
          🐍
        </div>
      </div>
    </div>
  );
}
