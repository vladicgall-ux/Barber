import Image from 'next/image';

export default function ServiceList({ services, selectedId, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {services.map((service) => {
        const active = service.id === selectedId;
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service)}
            className={`text-left rounded-xl border overflow-hidden transition-all ${
              active
                ? 'border-silver bg-steel shadow-lg shadow-black/40'
                : 'border-white/10 bg-charcoal hover:border-white/30'
            }`}
          >
            {service.image_url && (
              <div className="relative w-full aspect-[4/3] bg-black/30">
                <Image
                  src={service.image_url}
                  alt={service.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover grayscale-[15%]"
                />
              </div>
            )}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white">{service.name}</span>
                <span className="text-silver font-semibold whitespace-nowrap">{service.price}₽</span>
              </div>
              <div className="text-xs text-white/40 mt-1">{service.duration_minutes} мин</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
