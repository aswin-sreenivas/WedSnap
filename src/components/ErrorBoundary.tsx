import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage =
        'Something went wrong while loading this view. Please refresh or return home.';
      if (this.state.message.includes('Missing or insufficient permissions')) {
        friendlyMessage =
          'Your account does not currently have permission to access this wedding resource. Please sign in with the event organizer account.';
      }

      return (
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-6 py-16">
          <div className="max-w-lg w-full bg-white border border-[#E7E2D8] rounded-2xl p-8 text-center">
            <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-3">
              WedSnap Recovery
            </p>
            <h1 className="text-3xl font-semibold text-[#1C1917] mb-3">
              Unable to load this page
            </h1>
            <p className="text-sm text-[#57534E] leading-relaxed mb-6">{friendlyMessage}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 text-sm font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#292524] transition-colors whitespace-nowrap shrink-0"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="px-5 py-2.5 text-sm font-medium border border-[#D6D3CD] text-[#1C1917] rounded-lg hover:bg-[#F3F0EA] transition-colors whitespace-nowrap shrink-0"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
