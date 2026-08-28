import school from '../config/school';

export default function Logo({ size = 56, className = '' }) {
  return (
    <img
      src="/logo.png"
      alt={`${school.shortName} Logo`}
      style={{ width: size, height: size }}
      className={`object-contain ${className}`}
    />
  );
}
