import school from '../config/school';

export default function Header({ title, right }) {
  return (
    <header className="bg-white border-b-4 border-gold px-8 py-5 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-maroon tracking-tight">
          {school.fullName.toUpperCase()}
        </h1>
        <p className="text-sm text-gray-500">{school.address}</p>
        {title && <p className="mt-2 text-lg font-semibold text-gray-700">{title}</p>}
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}
