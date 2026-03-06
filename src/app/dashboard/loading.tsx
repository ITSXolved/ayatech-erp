export default function Loading() {
    return (
        <div className="flex flex-col flex-1 h-full w-full justify-center items-center py-20 animate-pulse space-y-8">
            <div className="flex justify-between w-full max-w-7xl px-4 md:px-8 mb-4">
                <div className="h-10 bg-slate-200 dark:bg-zinc-800 rounded-md w-1/3"></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full max-w-7xl px-4 md:px-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-xl"></div>
                ))}
            </div>
            <div className="w-full max-w-7xl px-4 md:px-8 space-y-4 mt-8">
                <div className="h-64 bg-slate-200 dark:bg-zinc-800 rounded-xl w-full"></div>
            </div>
            <div className="flex space-x-2 text-muted-foreground animate-bounce mt-8">
                <span className="h-2 w-2 bg-slate-400 rounded-full"></span>
                <span className="h-2 w-2 bg-slate-400 rounded-full animation-delay-200"></span>
                <span className="h-2 w-2 bg-slate-400 rounded-full animation-delay-400"></span>
            </div>
        </div>
    )
}
