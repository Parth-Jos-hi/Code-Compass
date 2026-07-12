'use client';

import React, { useState, useEffect } from 'react';
import { Question, evaluateAnswer, AnswerEvaluation } from '@/services/api';
import { Loader2Icon, CheckCircleIcon, XCircleIcon } from 'lucide-react';

interface QuestionModuleProps {
  questions: Question[];
  nodeId: number;
  filePath: string;
  onAnswerSubmitted?: (evaluation: AnswerEvaluation) => void;
  onQuizComplete?: () => void;
}

export default function QuestionModule({
  questions,
  nodeId,
  filePath,
  onAnswerSubmitted,
  onQuizComplete,
}: QuestionModuleProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-400">No questions available for this module.</p>
        <p className="text-gray-500 text-sm mt-2">
          Try clicking "Generate Questions" to create some.
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const options = currentQuestion.options_json
    ? JSON.parse(currentQuestion.options_json)
    : [];

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer.trim()) {
      alert('Please provide an answer');
      return;
    }

    setLoading(true);
    try {
      const result = await evaluateAnswer(currentQuestion.id, selectedAnswer);
      setEvaluation(result);
      setShowFeedback(true);
      setAnsweredQuestions(new Set([...answeredQuestions, currentQuestion.id]));

      if (onAnswerSubmitted) {
        onAnswerSubmitted(result);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to evaluate answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
      setEvaluation(null);
      setShowFeedback(false);
    } else {
      // All questions answered
      alert('Quiz complete! You have answered all questions.');
      setCurrentQuestionIndex(0);
      setSelectedAnswer('');
      setEvaluation(null);
      setShowFeedback(false);
      if (onQuizComplete) {
        onQuizComplete();
      }
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {filePath.split('/').pop()}
          </h2>
          <span className="text-sm text-gray-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1">
          <div
            className="bg-blue-600 h-1 rounded-full transition-all"
            style={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg text-gray-200 mb-6">
          {currentQuestion.question_text}
        </h3>

        {currentQuestion.question_type === 'mcq' ? (
          <div className="space-y-3">
            {options.map((option: string, index: number) => (
              <label
                key={index}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedAnswer === option
                    ? 'bg-blue-900 border-blue-600'
                    : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                }`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={loading || showFeedback}
                  className="mr-3"
                />
                <span className="text-gray-200">{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <textarea
            value={selectedAnswer}
            onChange={(e) => setSelectedAnswer(e.target.value)}
            disabled={loading || showFeedback}
            placeholder="Type your answer here..."
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-200 placeholder-gray-500 focus:border-blue-600 focus:outline-none resize-vertical min-h-24"
          />
        )}
      </div>

      {showFeedback && evaluation && (
        <div className={`mb-6 p-4 rounded-lg border ${
          evaluation.is_correct
            ? 'bg-green-900 border-green-600'
            : 'bg-red-900 border-red-600'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {evaluation.is_correct ? (
              <CheckCircleIcon size={20} className="text-green-400" />
            ) : (
              <XCircleIcon size={20} className="text-red-400" />
            )}
            <span className="font-bold text-white">
              {evaluation.is_correct ? 'Correct!' : 'Incorrect'}
            </span>
          </div>
          <p className="text-gray-200 mb-3">
            Score: {(evaluation.score * 100).toFixed(1)}%
          </p>
          <p className="text-sm text-gray-300 mb-3">
            {evaluation.feedback}
          </p>
          {evaluation.mastery_eligible && (
            <div className="text-sm text-green-300 font-semibold">
              ✓ You are eligible for mastery (75%+ average)
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-between">
        <div className="text-sm text-gray-400">
          {answeredQuestions.has(currentQuestion.id) && (
            <span className="text-green-400">✓ Answered</span>
          )}
        </div>
        <div className="flex gap-3">
          {!showFeedback ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2Icon size={16} className="animate-spin" />}
              {loading ? 'Evaluating...' : 'Submit Answer'}
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {currentQuestionIndex === questions.length - 1
                ? 'Finish Quiz'
                : 'Next Question'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
