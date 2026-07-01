import { cn } from "@/lib/utils";
import styles from "./HomeButton.module.css";

const HOME_ICON_PATH =
  "M50,14 C50,11.5 52.5,11.5 53.8,13.2 L83.5,44.5 C85.5,46.2 86.5,47.5 86.5,49.5 L86.5,87 C86.5,89.2 84.8,90 83,90 L17,90 C15.2,90 13.5,89.2 13.5,87 L13.5,49.5 C13.5,47.5 14.5,46.2 16.5,44.5 L46.2,13.2 C47.5,11.5 50,11.5 50,14 Z M40.5,66.5 C40.5,61.5 44.5,58.5 50,58.5 C55.5,58.5 59.5,61.5 59.5,66.5 L59.5,90 L40.5,90 Z";

interface HomeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function HomeButton({
  label = "Home",
  className,
  type = "button",
  ...props
}: HomeButtonProps) {
  return (
    <button
      type={type}
      className={cn(styles.orb, className)}
      aria-label={label}
      {...props}
    >
      <svg className={styles.icon} viewBox="0 0 100 100" aria-hidden>
        <path d={HOME_ICON_PATH} fill="white" fillRule="evenodd" />
      </svg>
    </button>
  );
}
