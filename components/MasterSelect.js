import Image from 'next/image';

export default function MasterSelect({ masters, selectedId, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {masters.map((master) => {
        const active = master.id === selectedId;
        return (
          <button
            key={master.id}
            type="button"
            onClick={() => onSelect(master)}
            className={`rounded-xl border px-4 py-4 flex flex-col items-center gap-2 transition-all ${
              active
                ? 'border-silver bg-steel shadow-lg shadow-black/40'
                : 'border-white/10 bg-charcoal hover:border-white/30'
            }`}
          >
            {master.avatar_url ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-black/30">
                <Image
                  src={master.avatar_url}
                  alt={master.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-lg font-bold">
                {master.name.charAt(0)}
              </div>
            )}
            <span className="font-medium">{master.name}</span>
          </button>
        );
      })}
    </div>
  );
}
