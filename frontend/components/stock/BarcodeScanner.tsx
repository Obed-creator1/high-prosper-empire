// components/stock/BarcodeScanner.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Barcode, Camera } from 'lucide-react';
import { useState } from 'react';

export function BarcodeScanner({ open, onOpenChange, onScan }: { open: boolean; onOpenChange: (open: boolean) => void; onScan: (code: string) => void }) {
    const [code, setCode] = useState('');

    const handleScan = () => {
        if (code.trim()) {
            onScan(code);
            setCode('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Barcode className="w-6 h-6" /> Barcode Scanner
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Scan or type barcode..."
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                            autoFocus
                        />
                        <Button onClick={handleScan}>
                            <Camera className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="text-center text-6xl font-mono text-muted-foreground">
                        {code || '—'}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}