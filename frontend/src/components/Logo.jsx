export default function Logo({ size = 56, className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="HIGCHEMS Logo"
      style={{ width: size, height: size }}
      className={`object-contain ${className}`}
    />
  );
}
