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
    <div className="bg-[#0c0c0c] border border-neutral-900 rounded-2xl p-8 max-w-4xl mx-auto shadow-2xl premium-border-glow">
      <div className="mb-8 border-b border-neutral-900 pb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white font-mono">
              {filePath.split('/').pop()}
            </h2>
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-rose-500 h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold text-neutral-200 mb-6 leading-relaxed">
          {currentQuestion.question_text}
        </h3>

        {currentQuestion.question_type === 'mcq' ? (
          <div className="space-y-3">
            {options.map((option: string, index: number) => (
              <label
                key={index}
                className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${
                  selectedAnswer === option
                    ? 'bg-rose-950/20 border-rose-500 text-white font-bold'
                    : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={loading || showFeedback}
                  className="mr-3 accent-rose-500"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <textarea
            value={selectedAnswer}
            onChange={(e) => setSelectedAnswer(e.target.value)}
            disabled={loading || showFeedback}
            placeholder="Type your detailed answer here..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white text-sm placeholder-neutral-600 focus:border-rose-500 focus:outline-none resize-y min-h-48 transition-colors leading-relaxed"
          />
        )}
      </div>

      {showFeedback && evaluation && (
        <div className={`mb-8 p-6 rounded-xl border ${
          evaluation.is_correct
            ? 'bg-green-950/20 border-green-900/50 text-green-300'
            : 'bg-red-950/20 border-red-900/50 text-red-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {evaluation.is_correct ? (
              <CheckCircleIcon size={20} className="text-green-400" />
            ) : (
              <XCircleIcon size={20} className="text-red-400" />
            )}
            <span className="font-black uppercase tracking-wider text-sm">
              {evaluation.is_correct ? 'Correct!' : 'Incorrect'}
            </span>
          </div>
          <p className="text-lg font-mono font-black text-white mb-3">
            Score: {(evaluation.score * 100).toFixed(1)}%
          </p>
          <p className="text-sm text-neutral-300 leading-relaxed mb-3">
            {evaluation.feedback}
          </p>
          {evaluation.mastery_eligible && (
            <div className="text-xs text-green-400 font-bold uppercase tracking-wider">
              ✓ You are eligible for mastery (75%+ average)
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 justify-between items-center">
        <div className="text-xs font-mono font-bold text-neutral-500">
          {answeredQuestions.has(currentQuestion.id) && (
            <span className="text-green-400 uppercase tracking-widest">✓ Answered</span>
          )}
        </div>
        <div className="flex gap-3">
          {!showFeedback ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={loading}
              className="coral-glow-btn text-white font-bold py-3 px-6 rounded-xl cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2Icon size={16} className="animate-spin" />}
              {loading ? 'Evaluating Answer...' : 'Submit Answer'}
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl cursor-pointer transition-colors"
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
