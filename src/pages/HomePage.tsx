import React from "react";

const HomePage: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-4">Welcome to LearnHub</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Discover quizzes, connect with peers, and build your learning journey
      </p>
    </div>
  </div>
);

export default HomePage;
