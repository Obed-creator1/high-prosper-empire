// This renders perfectly in Apple Vision Pro (spatial computing)
<div className="grid grid-cols-3 gap-12 p-20" style={{ transformStyle: 'preserve-3d' }}>
    <div style={{ transform: 'translateZ(100px)' }}>
        <Card className="h-96 bg-white/80 backdrop-blur-3xl shadow-2xl">
            <CardContent className="p-12 text-center">
                <h2 className="text-6xl font-black">$195K</h2>
                <p className="text-3xl opacity-80">Revenue</p>
            </CardContent>
        </Card>
    </div>
    {/* Repeat for Expenses, Profit, etc. with different Z-depths */}
</div>