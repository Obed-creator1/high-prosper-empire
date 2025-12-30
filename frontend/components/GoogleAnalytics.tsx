// components/GoogleAnalytics.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

export default function GoogleAnalytics() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!window.gtag || !process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;

        const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
        window.gtag("config", process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
            page_path: url,
            page_title: document.title,
        });
    }, [pathname, searchParams]);

    if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return null;

    return (
        <>
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <Script
                id="gtag-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname + window.location.search,
            });
          `,
                }}
            />
        </>
    );
}