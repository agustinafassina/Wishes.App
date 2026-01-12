// app/page.tsx
import Image from "next/image";
import Map from "../components/Map"; // Ajustar la ruta del componente

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start py-16 px-16 bg-white dark:bg-black sm:items-start">
        <header className="flex items-center justify-between w-full mb-6">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />
          <h1 className="flex-grow text-center text-2xl font-bold text-black dark:text-zinc-50">
            Agustina Fassina
          </h1>
        </header>

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h2 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Bienvenido a mi Blog de Viajes
          </h2>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Aquí encontrarás mi checklist de países por conocer y mucha más información sobre mis viajes.
          </p>
        </div>

      </main>
    </div>
  );
}