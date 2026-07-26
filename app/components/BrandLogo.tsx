import { LogoMark } from "./LogoMark";
import styles from "./BrandLogo.module.css";

type Props = {
  withWordmark?: boolean;
  className?: string;
  size?: number;
};

export function BrandLogo({
  withWordmark = true,
  className = "",
  size = 28,
}: Props) {
  return (
    <span className={`${styles.brand} ${className}`.trim()}>
      <LogoMark size={size} className={styles.mark} />
      {withWordmark && <span className={styles.word}>SMM-Agents</span>}
    </span>
  );
}
