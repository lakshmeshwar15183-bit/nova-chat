'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { pollService } from '@/lib/services';
import { apiErrorMessage } from '@/lib/api';

const MAX_OPTIONS = 10;

export function CreatePollModal({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [creating, setCreating] = useState(false);

  const setOption = (index: number, value: string) =>
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));

  const addOption = () => setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, ''] : prev));

  const removeOption = (index: number) =>
    setOptions((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));

  const create = async () => {
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) return toast.error('Add a question');
    if (trimmedOptions.length < 2) return toast.error('Add at least two options');

    setCreating(true);
    try {
      await pollService.create(conversationId, {
        question: question.trim(),
        options: trimmedOptions,
        allowMultiple,
      });
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal title="Create poll" onClose={onClose}>
      <input
        autoFocus
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question"
        maxLength={300}
        className="input mb-4"
      />

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={100}
              className="input"
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="btn-ghost h-9 w-9 shrink-0 p-0">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < MAX_OPTIONS && (
        <button onClick={addOption} className="btn-ghost mt-2 text-nova-600">
          <Plus className="h-4 w-4" />
          Add option
        </button>
      )}

      <label className="mt-4 flex cursor-pointer items-center justify-between">
        <span className="text-sm text-slate-700 dark:text-slate-200">Allow multiple answers</span>
        <button
          type="button"
          onClick={() => setAllowMultiple((v) => !v)}
          className={`relative h-6 w-11 rounded-full transition ${
            allowMultiple ? 'bg-nova-600' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
              allowMultiple ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </label>

      <button onClick={create} className="btn-primary mt-5 w-full py-2.5" disabled={creating}>
        {creating ? <Spinner className="h-4 w-4" /> : 'Create poll'}
      </button>
    </Modal>
  );
}
