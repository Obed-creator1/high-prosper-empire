import { Mic, Square } from "lucide-react";
import {useEffect, useRef, useState} from "react";
import {Button} from "react-day-picker";

export default function VoiceComplaint({ onSubmit }: { onSubmit: (text: string) => void }) {
    const [recording, setRecording] = useState(false);
    const [transcript, setTranscript] = useState("");

    const recognition = useRef<any>(null);

    useEffect(() => {
        if ("webkitSpeechRecognition" in window) {
            recognition.current = new (window as any).webkitSpeechRecognition();
            recognition.current.continuous = true;
            recognition.current.lang = "rw-RW"; // Kinyarwanda first, fallback to en-US
            recognition.current.interimResults = true;

            recognition.current.onresult = (event: any) => {
                const text = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map(result => result.transcript)
                    .join("");
                setTranscript(text);
            };
        }
    }, []);

    const toggleRecording = () => {
        if (recording) {
            recognition.current?.stop();
            onSubmit(transcript);
        } else {
            recognition.current?.start();
        }
        setRecording(!recording);
    };

    return (
        <div className="p-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
            <h3 className="text-xl font-bold mb-4">Speak Your Complaint (Kinyarwanda / English)</h3>
            <textarea
                className="w-full p-4 rounded-lg text-gray-900 mb-4"
                rows={4}
                value={transcript}
                readOnly
                placeholder="Your voice will appear here..."
            />
            <Button
                size="lg"
                onClick={toggleRecording}
                className={recording ? "bg-red-600 hover:bg-red-700" : "bg-white text-purple-600 hover:bg-gray-100"}
            >
                {recording ? <Square className="mr-2" /> : <Mic className="mr-2" />}
                {recording ? "Stop Recording" : "Start Speaking"}
            </Button>
        </div>
    );
}