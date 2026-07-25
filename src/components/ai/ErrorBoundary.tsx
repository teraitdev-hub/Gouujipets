import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

export class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-white p-10 overflow-auto">
          <h1 className="text-red-500 text-2xl font-bold mb-4">ChatWindow Crashed!</h1>
          <pre className="text-sm bg-gray-100 p-4 rounded text-red-600 whitespace-pre-wrap">
            {this.state.error?.toString()}
          </pre>
          <pre className="text-xs bg-gray-100 p-4 rounded mt-4 text-gray-800 whitespace-pre-wrap">
            {this.state.error?.stack}
          </pre>
          <button onClick={() => this.setState({hasError: false, error: null})} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Retry
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}
