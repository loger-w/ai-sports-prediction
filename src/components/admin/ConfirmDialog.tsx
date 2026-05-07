import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const DESTRUCTIVE_CLASS =
  'bg-[#fc8181] text-[#0a0a0f] hover:bg-[#fb6e6e]'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '確認',
  cancelLabel = '取消',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <AlertDialogContent style={FONT}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? DESTRUCTIVE_CLASS : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
