import Image from 'next/image';
import Link from 'next/link';

export function MenuBar() {
  return (
    <header className="w-full bg-white px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-x-3">
          <Link 
            href="https://serverlessllm.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-x-3"
          >
            <Image
              src="/logo.svg"
              alt="ServerlessLLM Logo"
              width={40}
              height={40}
              priority 
            />
            <span className="text-xl font-bold text-[#1c1e21] tracking-tight">
              ServerlessLLM
            </span>
          </Link>
        </div>

        <div className="flex items-center">
          <Link 
            href="https://github.com/ServerlessLLM/ServerlessLLM"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Image
              src="/github-mark.svg"
              alt="GitHub Logo"
              width={32}
              height={32}
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
