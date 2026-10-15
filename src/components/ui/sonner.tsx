import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ closeButton = true, toastOptions, icons, ...props }: ToasterProps) => {
  let theme: ToasterProps["theme"] = "system";
  try {
    const themeContext = useTheme();
    if (themeContext?.theme) {
      theme = themeContext.theme as ToasterProps["theme"];
    }
  } catch {
    // fallback to system if rendered outside ThemeProvider
  }

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      closeButton={closeButton}
      icons={{
        close: <X className="size-3.5 stroke-[2.2]" />,
        ...icons,
      }}
      toastOptions={{
        ...toastOptions,
        closeButton: true,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:pr-10 font-sans",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "!left-auto !right-2.5 !top-1/2 !-translate-y-1/2 !opacity-80 hover:!opacity-100 !transition-all !cursor-pointer",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

