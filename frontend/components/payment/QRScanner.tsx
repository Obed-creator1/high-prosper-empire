import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";

export default function QRScanner({ onScan }: { onScan: (account: string) => void }) {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
        scanner.render(
            (decodedText) => {
                const account = decodedText.split("account=")[1];
                onScan(account);
                scanner.clear();
            },
            (error) => console.warn(error)
        );
        return () => scanner.clear();
    }, []);

    return <div id="reader" className="w-full max-w-md mx-auto" />;
}