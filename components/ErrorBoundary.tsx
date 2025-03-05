// components/ErrorBoundary.tsx
import { Button } from "@/components/ui/button";
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleRefresh = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center h-screen p-6 bg-gray-50 dark:bg-gray-900">
          <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
              Something went wrong
            </h2>

            <p className="mb-4 text-gray-700 dark:text-gray-300">
              We're sorry, but an error occurred while rendering this component.
            </p>

            {this.state.error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-md overflow-auto">
                <p className="font-mono text-sm text-red-800 dark:text-red-300">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex space-x-4">
              <Button onClick={this.handleReset} variant="outline">
                Try Again
              </Button>
              <Button onClick={this.handleRefresh}>Refresh Page</Button>
            </div>
          </div>
        </div>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
