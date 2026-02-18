"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wordCount, canPublish, WORD_COUNT_TARGET, WORD_COUNT_LIMIT } from "../../../../domain/essay/operations";
import { formatPublishedDate } from "../../../../domain/essay/formatting";
import { TipTapDocSchema } from "../../../../domain/essay/schemas";
import { checkCitationMismatches } from "../../../../domain/evidence/citation-mismatch";
import { updateDraftAction, publishEssayAction, unpublishEssayAction } from "../actions";
import { NOT_DRAFT_ERROR } from "../error-codes";
import { useReview } from "../use-review";
import { FeedbackPanel } from "./feedback-panel";
import { EvidencePicker } from "./evidence-picker";
import { CitationWarnings } from "./citation-warnings";
import { useEvidenceLinks } from "./use-evidence-links";
import { findTextPosition } from "./prosemirror-utils";
import { EvidenceMark } from "../extensions/evidence-mark";
import { VersionHistoryPanel } from "./version-history-panel";
import { SprintTimer } from "./sprint-timer";
import type { TipTapDoc } from "../../../../domain/essay/essay";
import type { EvidenceLinkData, EvidenceCardSummary } from "../../evidence-types";

type SaveStatus = "saved" | "saving" | "unsaved";
type SidePanel = "none" | "feedback" | "evidence-picker" | "history";

type Props = {
  id: string;
  initialTitle: string;
  initialContent: TipTapDoc;
  initialStatus: "draft" | "published";
  initialPublishedAt: string | null;
  initialLinks?: EvidenceLinkData[];
  evidenceCards?: EvidenceCardSummary[];
  initialVersionCount?: number;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`border-2 px-2.5 py-1 text-sm font-bold transition-all duration-150 ${
        active
          ? "border-[#B74134] bg-[#B74134] text-white shadow-[3px_3px_0px_#2C2416]"
          : "border-stone-300 bg-white text-stone-600 shadow-[2px_2px_0px_#2C2416] hover:border-stone-900 hover:text-stone-900 hover:shadow-[3px_3px_0px_#2C2416]"
      } active:shadow-[1px_1px_0px_#2C2416] active:translate-x-[1px] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

export function EssayEditor({
  id,
  initialTitle,
  initialContent,
  initialStatus,
  initialPublishedAt,
  initialLinks = [],
  evidenceCards = [],
  initialVersionCount = 0,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [words, setWords] = useState(() => wordCount(initialContent));
  const [status, setStatus] = useState(initialStatus);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>("none");
  const [versionCount, setVersionCount] = useState(initialVersionCount);
  const [currentDoc, setCurrentDoc] = useState<TipTapDoc>(initialContent);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ title?: string; content?: TipTapDoc } | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const isDraft = status === "draft";
  const review = useReview(id);
  const evidence = useEvidenceLinks(id, initialLinks);

  // Auto-open feedback panel if review was hydrated from sessionStorage
  useEffect(() => {
    if (review.status === "done" || review.status === "error") {
      setSidePanel((prev) => prev === "none" ? "feedback" : prev);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    (data: { title?: string; content?: TipTapDoc }) => {
      const doSave = async (payload: { title?: string; content?: TipTapDoc }) => {
        setSaveStatus("saving");
        const result = await updateDraftAction(id, payload);
        if ("error" in result) {
          setSaveError(result.error);
          setSaveStatus("unsaved");
          return;
        }
        setSaveError(null);
        setSaveStatus("saved");
        // Drain any changes that accumulated during this save
        if (pendingRef.current) {
          const queued = pendingRef.current;
          pendingRef.current = null;
          await doSave(queued);
        }
      };
      queueRef.current = queueRef.current.then(() => doSave(data));
      return queueRef.current;
    },
    [id],
  );

  const scheduleSave = useCallback(
    (data: { title?: string; content?: TipTapDoc }) => {
      pendingRef.current = {
        ...pendingRef.current,
        ...data,
      };
      setSaveStatus("unsaved");
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        if (pendingRef.current) {
          const toSave = pendingRef.current;
          pendingRef.current = null;
          void save(toSave);
        }
      }, 1500);
    },
    [save],
  );

  const flushPending = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (pendingRef.current) {
      const toSave = pendingRef.current;
      pendingRef.current = null;
      void save(toSave);
    }
    await queueRef.current;
  }, [save]);

  const handleGetFeedback = useCallback(() => {
    setSidePanel("feedback");
    void flushPending().then(() => review.requestReview(id));
  }, [flushPending, review, id]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      EvidenceMark,
    ],
    content: JSON.parse(JSON.stringify(initialContent)) as JSONContent,
    editable: isDraft,
    onUpdate: ({ editor: e }) => {
      const parsed = TipTapDocSchema.safeParse(e.getJSON());
      if (!parsed.success) return;
      setWords(wordCount(parsed.data));
      setCurrentDoc(parsed.data);
      scheduleSave({ content: parsed.data });
    },
    editorProps: {
      attributes: {
        class: "tiptap outline-none",
      },
    },
  });

  // Apply evidence marks when editor or links change
  useEffect(() => {
    if (editor && evidence.links.length > 0) {
      evidence.applyMarks(editor, evidence.links);
    }
    // Only run on initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handleCommentClick = useCallback(
    (quotedText: string) => {
      if (!editor) return;
      const position = findTextPosition(editor.state.doc, quotedText);
      if (!position) return;
      editor.chain().focus().setTextSelection(position).run();
    },
    [editor],
  );

  // Sync editable state when status changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(isDraft);
    }
  }, [editor, isDraft]);

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (pendingRef.current) {
        const toSave = pendingRef.current;
        pendingRef.current = null;
        void save(toSave);
      }
    };
  }, [save]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    scheduleSave({ title: e.target.value });
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    await flushPending();
    const result = await publishEssayAction(id);
    setPublishing(false);
    if ("error" in result) {
      setPublishError(result.error);
      return;
    }
    setStatus("published");
    setPublishedAt(result.publishedAt);
    setVersionCount((c) => c + 1);
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    setPublishError(null);
    const result = await unpublishEssayAction(id);
    setPublishing(false);
    if ("error" in result) {
      setPublishError(result.error);
      return;
    }
    setStatus("draft");
    setPublishedAt(null);
  };

  const handleAttachEvidence = () => {
    if (sidePanel === "evidence-picker") {
      setSidePanel("none");
      evidence.closePicker();
    } else {
      setSidePanel("evidence-picker");
      evidence.openPicker();
    }
  };

  const handleHistory = () => {
    setSidePanel(sidePanel === "history" ? "none" : "history");
  };

  const handlePickCard = useCallback(
    (cardId: string) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      if (from === to) return;

      const selectedText = editor.state.doc.textBetween(from, to);
      if (!selectedText.trim()) return;

      // Determine the block index of the selection start
      let blockIndex = 0;
      const { doc } = editor.state;
      doc.forEach((node, offset, index) => {
        if (offset <= from) {
          blockIndex = index;
        }
      });

      setEvidenceError(null);
      void evidence.attach(editor, cardId, selectedText, blockIndex).then((err) => {
        if (err) setEvidenceError(err);
      });
    },
    [editor, evidence],
  );

  const handleDetachLink = useCallback(
    (linkId: string) => {
      if (!editor) return;
      setEvidenceError(null);
      void evidence.detach(editor, linkId).then((err) => {
        if (err) setEvidenceError(err);
      });
    },
    [editor, evidence],
  );

  // Citation mismatch detection — uses narrow LinkForMismatchCheck type
  const mismatches = useMemo(() => {
    const linksForCheck = evidence.links.map((l) => ({
      linkId: l.id,
      claimText: l.claimText,
      anchorBlockIndex: l.anchorBlockIndex,
      card: {
        sourceTitle: l.card.sourceTitle,
        stance: l.card.stance,
      },
    }));
    return checkCitationMismatches({ doc: currentDoc, links: linksForCheck });
  }, [currentDoc, evidence.links]);

  // Check if text is selected for the "Attach Evidence" button
  const [hasSelection, setHasSelection] = useState(false);
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { from, to } = editor.state.selection;
      setHasSelection(from !== to);
    };
    editor.on("selectionUpdate", handler);
    return () => { editor.off("selectionUpdate", handler); };
  }, [editor]);

  const wordColor =
    words > WORD_COUNT_LIMIT ? "text-red-800" : words >= WORD_COUNT_TARGET ? "text-[#B74134]" : "text-stone-500";

  const progressWidth = Math.min((words / WORD_COUNT_LIMIT) * 100, 100);
  const progressColor =
    words > WORD_COUNT_LIMIT ? "#991b1b" : words >= WORD_COUNT_TARGET ? "#B74134" : "#a8a29e";

  const saveLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : saveError === NOT_DRAFT_ERROR
          ? "This essay was published in another tab. Unpublish to continue editing."
          : saveError ?? "Unsaved changes";

  const saveColor =
    saveStatus === "saved"
      ? "text-stone-500"
      : saveStatus === "saving"
        ? "text-stone-500"
        : "text-amber-800";

  const showFeedback = sidePanel === "feedback" && review.status !== "idle";
  const showPicker = sidePanel === "evidence-picker";
  const showHistory = sidePanel === "history";
  const hasSidePanel = showFeedback || showPicker || showHistory;

  return (
    <div className={`mx-auto animate-fade-up ${hasSidePanel ? "flex max-w-6xl gap-8" : "max-w-2xl"}`}>
      {/* Editor column */}
      <div className={hasSidePanel ? "flex-1 min-w-0" : ""}>
        {/* Title — borderless, blends into page */}
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled essay"
          disabled={!isDraft}
          className="w-full border-0 bg-transparent px-0 py-2 font-serif text-2xl sm:text-4xl font-semibold tracking-tight text-stone-900 placeholder:text-stone-300 focus:outline-none disabled:cursor-default disabled:opacity-100"
          maxLength={200}
        />

        {/* Status bar — quiet metadata line */}
        <div className="mt-2 flex items-center gap-3 text-sm font-medium">
          {isDraft ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              Draft
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Published
            </span>
          )}
          <span className={wordColor}>
            {words} words
          </span>
          <span className="text-stone-300">&middot;</span>
          {isDraft ? (
            <span className={saveColor}>{saveLabel}</span>
          ) : (
            publishedAt && (
              <span className="text-stone-500">
                Published {formatPublishedDate(new Date(publishedAt))}
              </span>
            )
          )}
        </div>

        {/* Word progress bar — signature interaction */}
        <div className="mt-3 mb-6 h-0.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${String(progressWidth)}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>

        {/* Error feedback */}
        {publishError && (
          <div className="mb-4 rounded border-2 border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">
            {publishError}
          </div>
        )}
        {evidenceError && (
          <div className="mb-4 rounded border-2 border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">
            {evidenceError}
          </div>
        )}

        {/* Citation warnings */}
        <CitationWarnings
          mismatches={mismatches}
          onRemoveLink={handleDetachLink}
        />

        {/* Action bar — publish/unpublish + feedback + evidence + view link */}
        <div className="mb-8 flex items-center gap-3">
          {isDraft ? (
            <>
              <button
                type="button"
                disabled={!canPublish(currentDoc, title) || publishing}
                onClick={() => void handlePublish()}
                className="border-2 border-emerald-700 bg-emerald-700 px-4 py-1.5 text-sm font-bold text-white shadow-[3px_3px_0px_#2C2416] transition-all duration-150 hover:bg-emerald-800 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {publishing ? "Publishing..." : "Publish"}
              </button>
              <button
                type="button"
                disabled={words === 0 || review.status === "loading" || publishing}
                onClick={() => { handleGetFeedback(); }}
                className="border-2 border-[#B74134] bg-white px-4 py-1.5 text-sm font-bold text-[#B74134] shadow-[3px_3px_0px_#2C2416] transition-all duration-150 hover:bg-[#B74134] hover:text-white active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {review.status === "loading" ? "Reviewing..." : "Get Feedback"}
              </button>
              <button
                type="button"
                disabled={!hasSelection}
                onClick={handleAttachEvidence}
                className={`border-2 px-4 py-1.5 text-sm font-bold shadow-[3px_3px_0px_#2C2416] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${
                  showPicker
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-emerald-700 bg-white text-emerald-700 hover:bg-emerald-700 hover:text-white"
                }`}
              >
                Attach Evidence
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={publishing}
                onClick={() => void handleUnpublish()}
                className="border-2 border-stone-300 bg-white px-4 py-1.5 text-sm font-bold text-stone-600 shadow-[3px_3px_0px_#2C2416] transition-all duration-150 hover:border-stone-900 hover:text-stone-900 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {publishing ? "Unpublishing..." : "Unpublish"}
              </button>
              <Link
                href={`/essay/${id}`}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
              >
                View public page &rarr;
              </Link>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/essay/${id}`;
                  void navigator.clipboard.writeText(url).then(
                    () => {
                      setCopied(true);
                      setTimeout(() => { setCopied(false); }, 2000);
                    },
                    () => { /* clipboard permission denied — button stays as "Copy link" */ },
                  );
                }}
                className="text-sm font-semibold text-stone-600 hover:text-stone-900"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </>
          )}
          {versionCount > 0 && (
            <button
              type="button"
              onClick={handleHistory}
              className={`border-2 px-4 py-1.5 text-sm font-bold shadow-[3px_3px_0px_#2C2416] transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#2C2416] ${
                showHistory
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-600 hover:border-stone-900 hover:text-stone-900"
              }`}
            >
              History
            </button>
          )}
        </div>

        {/* Sprint timer — only visible in draft mode */}
        {isDraft && <SprintTimer />}

        {/* Toolbar — neobrutalist buttons (hidden when published) */}
        {editor ? (
          <>
            {isDraft && (
              <div data-testid="editor-toolbar" className="mb-6 flex flex-wrap gap-2">
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  active={editor.isActive("bold")}
                >
                  B
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  active={editor.isActive("italic")}
                >
                  I
                </ToolbarButton>
                <ToolbarButton
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                  }
                  active={editor.isActive("heading", { level: 2 })}
                >
                  H2
                </ToolbarButton>
                <ToolbarButton
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 3 }).run()
                  }
                  active={editor.isActive("heading", { level: 3 })}
                >
                  H3
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  active={editor.isActive("bulletList")}
                >
                  List
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  active={editor.isActive("orderedList")}
                >
                  1.
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  active={editor.isActive("blockquote")}
                >
                  &ldquo;
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  active={editor.isActive("code")}
                >
                  {"<>"}
                </ToolbarButton>
              </div>
            )}

            {/* Editor — invisible container, content speaks */}
            <div className="min-h-[500px]">
              <EditorContent editor={editor} />
            </div>
          </>
        ) : (
          <div className="min-h-[500px]" />
        )}
      </div>

      {/* Feedback panel — right column on desktop */}
      {showFeedback && (
        <div className="w-full lg:w-[380px] flex-shrink-0">
          <div className="lg:sticky lg:top-8">
            <FeedbackPanel
              status={review.status}
              comments={review.comments}
              issues={review.issues}
              questions={review.questions}
              scores={review.scores}
              errorMessage={review.errorMessage}
              onCommentClick={handleCommentClick}
              onDismiss={() => { review.dismiss(); setSidePanel("none"); }}
              onRetry={() => { handleGetFeedback(); }}
            />
          </div>
        </div>
      )}

      {/* Evidence picker — right column on desktop */}
      {showPicker && (
        <EvidencePicker
          cards={evidenceCards}
          onPick={handlePickCard}
          onClose={() => { setSidePanel("none"); evidence.closePicker(); }}
        />
      )}

      {/* Version history — right column on desktop */}
      {showHistory && (
        <VersionHistoryPanel
          essayId={id}
          currentDoc={currentDoc}
          onDismiss={() => { setSidePanel("none"); }}
        />
      )}
    </div>
  );
}
