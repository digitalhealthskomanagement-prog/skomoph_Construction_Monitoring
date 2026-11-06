import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  /** Destructive actions get a red button. Defaults to true. */
  destructive?: boolean;
  /** When set, the user must type this exact text before the button enables. */
  requireText?: string;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Replaces window.confirm with an in-app dialog: `if (!(await confirm({...}))) return;`
export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return fn;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState("");
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // Settle any dialog still open so its caller doesn't hang
    resolver.current?.(false);
    setTyped("");
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(result: boolean) {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }

  const destructive = options?.destructive ?? true;
  const needsText = Boolean(options?.requireText);
  const textOk = !needsText || typed.trim() === options?.requireText?.trim();

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={options !== null} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">{options.description}</div>
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          {needsText && (
            <div className="space-y-2">
              <p className="text-sm">
                พิมพ์ <strong className="select-all">{options?.requireText}</strong> เพื่อยืนยัน
              </p>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                aria-label="พิมพ์ข้อความเพื่อยืนยัน"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={!textOk}
              className={destructive ? buttonVariants({ variant: "destructive" }) : undefined}
              onClick={(e) => {
                if (!textOk) {
                  e.preventDefault();
                  return;
                }
                close(true);
              }}
            >
              {options?.confirmText ?? (destructive ? "ลบ" : "ยืนยัน")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
