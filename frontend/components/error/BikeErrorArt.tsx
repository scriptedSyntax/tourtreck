export default function BikeErrorArt({ mood = "lost" }: { mood?: "lost" | "repair" }) {
  return (
    <div className="relative mx-auto mb-8 h-52 w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-accent/20 to-background p-6">
      <div className="absolute left-8 top-8 h-16 w-16 rounded-full bg-primary/20" />
      <div className="absolute right-10 top-10 h-8 w-8 rounded-full bg-accent" />
      <div className="absolute bottom-8 left-1/2 h-1 w-64 -translate-x-1/2 rounded-full bg-foreground/10" />

      <svg viewBox="0 0 420 220" className="relative z-10 h-full w-full" role="img" aria-label="Bicycle illustration">
        <circle cx="125" cy="150" r="42" fill="none" stroke="currentColor" strokeWidth="10" className="text-primary" />
        <circle cx="295" cy="150" r="42" fill="none" stroke="currentColor" strokeWidth="10" className="text-primary" />
        <path d="M125 150 L178 92 L230 150 L158 150 L202 92 L250 92 L295 150" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" className="text-foreground" />
        <path d="M198 92 L188 70 M180 70 H218 M250 92 L270 72 M264 72 H302" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-foreground" />
        <circle cx="230" cy="150" r="8" fill="currentColor" className="text-primary" />
        <path d="M226 150 L206 170 M230 150 L252 132" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-primary" />
        {mood === "lost" ? (
          <>
            <path d="M74 44 C92 24 124 24 142 44 C160 64 146 92 108 116 C70 92 56 64 74 44Z" fill="currentColor" className="text-primary/80" />
            <text x="104" y="75" textAnchor="middle" fontSize="34" fontWeight="700" fill="white">?</text>
          </>
        ) : (
          <>
            <path d="M78 60 L108 30 L126 48 L96 78 Z" fill="currentColor" className="text-primary/80" />
            <path d="M296 56 L330 90" stroke="currentColor" strokeWidth="10" strokeLinecap="round" className="text-foreground" />
            <path d="M320 50 L350 80" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-primary" />
          </>
        )}
      </svg>
    </div>
  );
}
