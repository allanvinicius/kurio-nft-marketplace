import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [value, setValue] = useState('')
  const navigate = useNavigate()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-24 translate-y-0 p-6" accentBar>
        <DialogTitle>Buscar NFTs</DialogTitle>
        <DialogDescription className="mt-1">Procure por nome, coleção, categoria ou atributo.</DialogDescription>
        <form
          role="search"
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const q = value.trim()
            onOpenChange(false)
            void navigate({ to: '/', search: (prev) => ({ ...prev, q: q || undefined, page: undefined }), hash: 'catalogo' })
          }}
        >
          <label htmlFor="global-search" className="sr-only">
            Termo de busca
          </label>
          <Input id="global-search" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ex.: Emerald Ape" maxLength={80} />
          <Button type="submit" aria-label="Buscar">
            <Search className="size-4" aria-hidden />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
