import { topicLabel } from '@/lib/takken/topics'
import type { Question } from '@/lib/takken/types'
import { yearLabel } from '@/lib/takken/years'
import { cn } from '@/lib/cn'

/** 年度・問番号・論点のラベル。問題カードの見出しに置く。 */
export function QuestionMeta({ question }: { question: Question }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
        {yearLabel(question.yearId)} 問{question.questionNumber}
      </span>
      <span className="rounded bg-slate-100 px-2 py-0.5 text-ink-700">
        {topicLabel(question.topic)}
      </span>
      {question.revisionNote ? (
        <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
          法改正あり
        </span>
      ) : null}
    </div>
  )
}

/** 法改正で結論が変わった論点の注意書き。 */
export function RevisionNote({ note }: { note: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-900">法改正に関する注意</p>
      <p className="mt-1 text-sm leading-relaxed text-amber-900">{note}</p>
    </div>
  )
}

/** 根拠条文の一覧。 */
export function ArticleList({ articles }: { articles: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {articles.map((article) => (
        <span
          key={article}
          className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-ink-700"
        >
          {article}
        </span>
      ))}
    </div>
  )
}

/**
 * 解答後に見せる解説一式。
 * 演習中の解説表示と、結果画面の振り返りの両方で使う。
 */
export function Explanation({
  question,
  selected,
}: {
  question: Question
  /** ユーザーが選んだ番号。未解答なら null。 */
  selected: 1 | 2 | 3 | 4 | null
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-ink-900">選択肢ごとの正誤</h3>
        <ul className="mt-2 space-y-2">
          {question.choices.map((choice) => {
            const isAnswer = choice.number === question.answer
            const isSelected = choice.number === selected

            return (
              <li
                key={choice.number}
                className={cn(
                  'rounded-lg border p-3 text-sm',
                  isAnswer
                    ? 'border-emerald-300 bg-emerald-50'
                    : isSelected
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200 bg-white',
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      isAnswer
                        ? 'bg-emerald-600 text-white'
                        : isSelected
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-200 text-ink-700',
                    )}
                  >
                    {choice.number}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="leading-relaxed text-ink-900">{choice.text}</p>
                    <p className="text-xs leading-relaxed text-ink-700">{choice.comment}</p>
                    {isSelected ? (
                      <p className="text-xs font-medium text-ink-500">あなたが選んだ選択肢</p>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
        <h3 className="text-sm font-semibold text-brand-800">解説</h3>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-ink-900">
          {question.explanation}
        </p>
      </div>

      {question.revisionNote ? <RevisionNote note={question.revisionNote} /> : null}

      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-ink-500">根拠条文</h3>
        <ArticleList articles={question.articles} />
      </div>
    </div>
  )
}
