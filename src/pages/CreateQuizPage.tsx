// Create Quiz Page - Advanced Quiz Builder
import React, { useState } from "react";
import { Plus, Trash2, Image, Type } from "lucide-react";

const CreateQuizPage: React.FC = () => {
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState(0);
  const [selectedFreeTrialQuestions, setSelectedFreeTrialQuestions] = useState<number[]>([]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        text: "",
        type: "text",
        options: [],
        correctAnswer: "",
        mediaUrl: null,
      },
    ]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: number, updates: any) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const toggleFreeTrialQuestion = (index: number) => {
    if (selectedFreeTrialQuestions.includes(index)) {
      setSelectedFreeTrialQuestions(
        selectedFreeTrialQuestions.filter((i) => i !== index)
      );
    } else {
      setSelectedFreeTrialQuestions([...selectedFreeTrialQuestions, index]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Create Quiz</h1>
          <p className="text-slate-400">
            Build engaging quizzes with rich media and flexible payment options
          </p>
        </div>

        {/* Quiz Details */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Quiz Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Quiz Title
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g., 'Python Fundamentals'"
                className="w-full bg-slate-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Description (SEO)
              </label>
              <textarea
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                placeholder="Brief description for search engines..."
                className="w-full bg-slate-700 text-white rounded px-4 py-2 min-h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Category
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Create new or select existing category"
                className="w-full bg-slate-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Payment Options */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Payment & Monetization</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-white">Make this quiz paid</span>
            </label>

            {isPaid && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full bg-slate-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-slate-700 rounded p-4">
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-white">Offer free trial questions</span>
                  </label>
                  <p className="text-xs text-slate-400">
                    Selected questions will be available free for users to preview
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Questions ({questions.length})</h2>
            <button
              onClick={addQuestion}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-300">
                    Question {index + 1}
                  </span>
                  <button
                    onClick={() => removeQuestion(question.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Question Text */}
                  <textarea
                    value={question.text}
                    onChange={(e) =>
                      updateQuestion(question.id, { text: e.target.value })
                    }
                    placeholder="Enter question text..."
                    className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Question Type */}
                  <select
                    value={question.type}
                    onChange={(e) =>
                      updateQuestion(question.id, { type: e.target.value })
                    }
                    className="w-full bg-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">Text Input</option>
                    <option value="radio">Radio Buttons</option>
                    <option value="checkbox">Checkboxes</option>
                  </select>

                  {/* Media Upload */}
                  <button className="w-full bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition">
                    <Image className="w-4 h-4" />
                    Add Image
                  </button>

                  {/* Free Trial Toggle */}
                  {isPaid && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFreeTrialQuestions.includes(index)}
                        onChange={() => toggleFreeTrialQuestion(index)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-300">
                        Include in free trial
                      </span>
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">
            Save & Preview
          </button>
          <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition">
            Save as Draft
          </button>
          <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition">
            Publish Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateQuizPage;
