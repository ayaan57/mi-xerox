import Link from "next/link";

const features = [
  {
    icon: "📤",
    title: "Easy Upload",
    description: "Drag & drop your files — PDFs, images, Word docs, and more.",
  },
  {
    icon: "⚡",
    title: "Quick Print",
    description: "Get your prints ready in just a few minutes.",
  },
  {
    icon: "🔒",
    title: "Secure",
    description: "Your files are auto-deleted after printing for full privacy.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-60 w-[600px] h-[600px] rounded-full bg-purple-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-20 sm:py-32">
        <div className="w-full max-w-2xl mx-auto text-center">
          {/* Frosted glass card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-indigo-500/10">
            {/* Printer icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                <svg
                  className="w-12 h-12 sm:w-14 sm:h-14 text-indigo-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.25 7.034V3.375"
                  />
                </svg>
              </div>
            </div>

            {/* Title with gradient text */}
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent mb-4">
              Mi Xerox
            </h1>

            {/* Tagline */}
            <p className="text-xl sm:text-2xl font-semibold text-indigo-200/90 mb-4">
              Smart Printing, Made Simple
            </p>

            {/* Description */}
            <p className="text-slate-300/80 text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed">
              Upload your documents, choose your settings, and collect your
              prints — all in just a few taps!
            </p>

            {/* Glowing CTA button */}
            <Link
              href="/upload"
              className="group relative inline-flex items-center gap-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 hover:from-indigo-400 hover:to-purple-400 active:scale-95 transition-all duration-300"
            >
              <svg
                className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              Upload Files
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 pb-20 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-7 sm:p-8 text-center hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300"
            >
              <span className="text-4xl mb-4 block">{f.icon}</span>
              <h3 className="text-lg font-bold text-white mb-2">
                {f.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative text-center text-slate-500 text-sm py-8 border-t border-white/5">
        © 2024 Mi Xerox
      </footer>
    </div>
  );
}
