import Image from 'next/image';

export default function ServiceList({ services, selectedId, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {services.map((service) => {
        const active = service.id === selectedId;
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service)}
            className={`text-left rounded-xl border transition-all flex items-center gap-3 px-3 py-3 ${
              active
                ? 'border-silver bg-steel shadow-lg shadow-black/40'
                : 'border-white/10 bg-charcoal hover:border-white/30'
            }`}
          >
            {service.image_url && (
              <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-black/30">
                <Image
                  src={service.image_url}
                  alt={service.name}
                  fill
                  sizes="56px"
                  className="object-cover grayscale-[15%]"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-white">{service.name}</span>
                <span className="text-silver font-semibold whitespace-nowrap shrink-0">{service.price}₽</span>
              </div>
              <div className="text-xs text-white/40 mt-1">{service.duration_minutes} мин</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
