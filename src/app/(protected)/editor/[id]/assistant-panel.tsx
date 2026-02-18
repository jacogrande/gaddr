"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  Conversation,
  AssistantContentBlock,
} from "../../../../domain/assistant/conversation";
import type {
  InlineComment,
  ReviewIssue,
  SocraticQuestion,
  RubricScore,
} from "../../../../domain/review/review";
import type { SourceSuggestion } from "../../../../domain/assistant/assistant";

type Props = {
  conversation: Conversation;
  status: "idle" | "loading" | "done" | "error";
  errorMessage: string | null;
  onSendMessage: (message: string, mode: "chat" | "full_review") => void;
  onCommentClick: (quotedText: string) => void;
  onClear: () => void;
  onDismiss: () => void;
};

// ── Reusable sub-components for rendering review artifacts ──

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-stone-100 text-stone-600 border-stone-200",
};

const TAG_LABELS: Record<string, string> = {
  clarity: "Clarity",
  evidence: "Evidence",
  structure: "Structure",
  argument: "Argument",
  style: "Style",
  originality: "Originality",
};

const STANCE_STYLES: Record<string, string> = {
  supporting: "bg-emerald-100 text-emerald-800 border-emerald-200",
  opposing: "bg-red-100 text-red-800 border-red-200",
  neutral: "bg-stone-100 text-stone-600 border-stone-200",
};

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-2.5 w-2.5 rounded-full border ${
            i <= score
              ? "border-[#B74134] bg-[#B74134]"
              : "border-stone-300 bg-white"
          }`}
        />
      ))}
    </div>
  );
}

function InlineCommentView({
  comment,
  onClick,
}: {
  comment: InlineComment;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left border-2 border-stone-100 hover:border-[#B74134] p-3 transition-colors group"
    >
      <p className="text-sm font-medium text-[#B74134] mb-1 group-hover:underline">
        &ldquo;{comment.quotedText}&rdquo;
      </p>
      <p className="text-sm text-stone-700 mb-1">
        <span className="font-semibold">Problem:</span> {comment.problem}
      </p>
      <p className="text-sm text-stone-600 mb-1">
        <span className="font-semibold">Why it matters:</span> {comment.why}
      </p>
      <p className="text-sm text-stone-700 italic mb-1">{comment.question}</p>
      <p className="text-sm text-stone-600">
        <span className="font-semibold">Action:</span>{" "}
        {comment.suggestedAction}
      </p>
    </button>
  );
}

function IssueView({ issue }: { issue: ReviewIssue }) {
  return (
    <div className="border-2 border-stone-100 p-3">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[issue.severity] ?? ""}`}
        >
          {issue.severity}
        </span>
        <span className="text-xs font-medium text-stone-500">
          {TAG_LABELS[issue.tag] ?? issue.tag}
        </span>
      </div>
      <p className="text-sm text-stone-700 mb-1">{issue.description}</p>
      <p className="text-sm text-stone-600">
        <span className="font-semibold">Action:</span>{" "}
        {issue.suggestedAction}
      </p>
    </div>
  );
}

function QuestionView({ q }: { q: SocraticQuestion }) {
  return (
    <div className="border-l-3 border-[#B74134] pl-3 py-1">
      <p className="text-sm font-medium text-stone-800 italic">{q.question}</p>
      <p className="text-xs text-stone-600 mt-1">{q.context}</p>
    </div>
  );
}

function RubricView({ score }: { score: RubricScore }) {
  return (
    <div className="flex items-center justify-between border-2 border-stone-100 p-2.5">
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-sm font-semibold text-stone-800 capitalize">
          {TAG_LABELS[score.dimension] ?? score.dimension}
        </p>
        <p className="text-xs text-stone-600 truncate">{score.rationale}</p>
      </div>
      <ScoreDots score={score.score} />
    </div>
  );
}

function SourceView({ source }: { source: SourceSuggestion }) {
  return (
    <div className="border-2 border-stone-100 p-3">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STANCE_STYLES[source.stance] ?? ""}`}
        >
          {source.stance}
        </span>
      </div>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-[#B74134] hover:underline"
      >
        {source.title}
      </a>
      <p className="text-sm text-stone-600 mt-1">{source.snippet}</p>
      <p className="text-xs text-stone-500 mt-1">{source.relevance}</p>
    </div>
  );
}

// ── Content Block Renderer ──

function ContentBlockView({
  block,
  onCommentClick,
}: {
  block: AssistantContentBlock;
  onCommentClick: (quotedText: string) => void;
}) {
  switch (block.kind) {
    case "text":
      return (
        <div className="text-sm text-stone-700 whitespace-pre-wrap">
          {block.text}
        </div>
      );

    case "review":
      return (
        <div className="space-y-4">
          {block.comments.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Inline Comments
              </h4>
              <div className="space-y-2">
                {block.comments.map((c, i) => (
                  <InlineCommentView
                    key={`comment-${String(i)}`}
                    comment={c}
                    onClick={() => {
                      onCommentClick(c.quotedText);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {block.issues.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Issues
              </h4>
              <div className="space-y-2">
                {block.issues.map((issue, i) => (
                  <IssueView
                    key={`issue-${String(i)}`}
                    issue={issue}
                  />
                ))}
              </div>
            </div>
          )}

          {block.questions.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Questions to Consider
              </h4>
              <div className="space-y-2">
                {block.questions.map((q, i) => (
                  <QuestionView key={`question-${String(i)}`} q={q} />
                ))}
              </div>
            </div>
          )}

          {block.scores.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Rubric
              </h4>
              <div className="space-y-2">
                {block.scores.map((s) => (
                  <RubricView key={s.dimension} score={s} />
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case "source":
      return (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
            Sources
          </h4>
          <div className="space-y-2">
            {block.sources.map((s, i) => (
              <SourceView key={`source-${String(i)}`} source={s} />
            ))}
          </div>
        </div>
      );
  }
}

// ── Message Bubble ──

function MessageBubble({
  message,
  onCommentClick,
}: {
  message: ChatMessage;
  onCommentClick: (quotedText: string) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] border-2 border-stone-200 bg-stone-50 px-4 py-3 shadow-[2px_2px_0px_#2C2416]">
          <p className="text-sm text-stone-800 whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] space-y-3">
        {message.blocks.map((block, i) => (
          <ContentBlockView
            key={`${message.id}-${String(i)}`}
            block={block}
            onCommentClick={onCommentClick}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function AssistantPanel({
  conversation,
  status,
  errorMessage,
  onSendMessage,
  onCommentClick,
  onClear,
  onDismiss,
}: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = status === "loading";

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.messages, status]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    onSendMessage(trimmed, "chat");
  }, [input, isLoading, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const hasMessages = conversation.messages.length > 0;

  return (
    <div
      data-testid="assistant-panel"
      className="border-2 border-stone-200 bg-white shadow-[4px_4px_0px_#2C2416] flex flex-col h-[calc(100vh-12rem)] max-h-[800px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b-2 border-stone-100">
        <h2 className="font-serif text-lg font-semibold text-stone-900">
          Writing Coach
        </h2>
        <div className="flex items-center gap-2">
          {hasMessages && (
            <button
              type="button"
              onClick={onClear}
              className="text-stone-400 hover:text-stone-600 text-xs font-medium"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="text-stone-500 hover:text-stone-600 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {!hasMessages && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-stone-400">
              <p className="text-sm font-medium mb-2">Ask your writing coach anything</p>
              <p className="text-xs">
                &ldquo;How can I strengthen my argument?&rdquo;
              </p>
              <p className="text-xs">
                &ldquo;Find sources about this topic&rdquo;
              </p>
              <p className="text-xs">
                &ldquo;What&apos;s unclear in my essay?&rdquo;
              </p>
            </div>
          </div>
        )}

        {conversation.messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onCommentClick={onCommentClick}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <div className="h-1.5 w-1.5 rounded-full bg-[#B74134] animate-pulse" />
            Thinking...
          </div>
        )}

        {/* Error state */}
        {status === "error" && errorMessage && (
          <div className="rounded border-2 border-red-300 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t-2 border-stone-100 px-4 py-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your essay..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none border-2 border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#B74134] focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || input.trim().length === 0}
            className="border-2 border-[#B74134] bg-[#B74134] px-3 py-2 text-sm font-bold text-white shadow-[2px_2px_0px_#2C2416] transition-all duration-150 hover:bg-[#a03529] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
