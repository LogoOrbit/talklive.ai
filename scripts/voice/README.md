# Voice model: data, training, results

`server/voice-model.json` is the model behind Voice check (`server/voice-check.js`). It takes the 33-number
summary of a person's own speech that `public/voice-features.js` computes on the device and returns the
probability that the voice sounds feminine. It is an estimate about a voice, not a fact about a person.

Model: neural network, 33 inputs, 8 tanh hidden units, Platt calibration, two confidence thresholds
(`confirm` 0.91, `mismatch` 0.97). Plain Node, no dependencies, seeded: the same data gives the same file.

## Reproduce

```
DATA=/path/with/25GB/free
bash scripts/voice/fetch-data.sh $DATA                    # resumable; a re-run skips finished pieces
node scripts/voice/manifest.js $DATA > $DATA/manifest.jsonl
for i in 0 1 2; do node scripts/voice/extract.js $DATA/manifest.jsonl $DATA/feats-$i.jsonl $i 3 & done; wait
node scripts/voice/train.js $DATA/feats-*.jsonl           # writes server/voice-model.json (--quick: small search)
node scripts/voice/make-fixtures.js $DATA/feats-*.jsonl > scripts/voice/fixtures.json
```

Extraction needs `ffmpeg`. Do not regenerate a manifest you have started extracting from (ids are line
numbers); for new files, extract a second manifest to separate output files. Extraction is resumable.
Retraining changes the model, so regenerate the fixtures after it.

## Data

| Source | Licence | Used for |
| --- | --- | --- |
| LibriSpeech (openslr.org/12): speaker sex from SPEAKERS.TXT | CC BY 4.0 | dev-clean: train; dev-other: validation; test-clean, test-other: test |
| Google FLEURS (huggingface.co/datasets/google/fleurs): gender per recording | CC BY 4.0 | see below |

FLEURS: train = a balanced sample (up to 260 women + 260 men) of the train split of 16 languages (ur, hi, bn,
pa, ta, ar, fa, tr, id, vi, es_419, pt_br, fr, ru, sw, en_us); validation = dev splits of languages that
have at least 40 women and 40 men there (24 languages are fetched); test = test splits of 8 languages never
trained on (ps, mr, it, ms, yo, th, am, sd). Groups never share a speaker or a language between train and
test. Each recording becomes up to three summaries (clean, and two degraded copies: noise, filtering,
narrow-band), each over a random 40-220 voiced frames. Counts (summaries): train 23,758, validation
10,531, test 22,477.

Choices made on validation only, using summaries with n >= 80 frames (devices never send fewer): hidden
size (0, 8, 16, 32), learning rate (0.003, 0.001, 0.0003), L2 (0.001 to 0.1), early stopping, calibration,
thresholds. The test group was scored once. The best network beat the best logistic regression on
validation (loss 0.151 vs 0.169) and on test (95.0% vs 94.5% accuracy).

## Results (test, never tuned on)

Counts are summaries, not recordings. "Device view" is n >= 80 frames only, what the server sees.

| | All | Device view (n >= 80) |
| --- | --- | --- |
| Summaries | 22,477 | 9,239 |
| Accuracy | 95.0% | 96.4% |
| Women / men | 97.0% / 92.9% | 98.1% / 94.1% |
| Clean / filtered / narrow-band / noisy | 94.7 / 95.0 / 95.9 / 94.9% | 96.3 / 97.0 / 96.3 / 96.1% |
| 80-139 frames / 140+ frames | 96.3 / 96.6% | same |
| Under 80 frames | 94.0% | not sent |
| Calibration error | 1.4% | 2.4% |

Device view, accuracy of the answers at or above a confidence: 0.80 -> 98.4% (92% of rows), 0.90 -> 99.0%
(83%), 0.95 -> 99.1% (72%), 0.98 -> 98.9% (51%), 0.99 -> 98.4% (24%).

With thresholds confirm 0.91 and mismatch 0.97: confirmed share 82.0% of rows, 99.1% of them right;
false-mismatch rate (wrong and confidence >= 0.97) 0.6% of rows. The server also needs two calls before it
says "mismatch".

Per set (all rows): am 98.4, it 99.2, mr 92.7, ms 77.1, ps 99.8, sd 99.5, th 100, yo 97.6, LibriSpeech
test-clean 91.9, test-other 90.6.

## Why the thresholds are not the 99% / 99.7% targets

The targets (99% right at or above `confirm`, 99.7% at or above `mismatch`) are not reachable on validation:
accuracy is flat at 98.5-98.7% from 0.9 to 0.98 and then falls, because the remaining errors are confident
ones. They sit in a few speakers whose recorded label disagrees with how they sound: FLEURS hi_in dev has 21
confident errors (men), ja_jp dev 9 of 9 (women); on test, LibriSpeech speaker 7105 (listed M, median pitch
about 230 Hz) is wrong on all 52 summaries, which is most of the 89 percent figure for test-other. These
rows were kept, not removed. Fallback rule (in `train.js`): among thresholds that keep enough rows and are
within 0.1 point of the best accuracy, `confirm` is the lowest and `mismatch` the highest. A higher bar
would not make "mismatch" safer, since the errors are the same speakers on every call.

## Known limits

- Read speech, in a quiet place, mostly adults. No children; no real call audio; few speakers per language
  (FLEURS) and only 40 in LibriSpeech dev-clean.
- Labels are self-reported or catalogue labels, binary, and sometimes wrong (see above). The model learns how
  voices are labelled, not anyone's gender.
- Worse on some groups: men are called feminine more often than the reverse (92.9% vs 97.0%); Malay (ms) is
  77%; Marathi 93%. A low-pitched woman or high-pitched man will be called "unclear" or wrong.
- Estimate, not proof: a single call is never enough to say "does not match", people can retry and appeal.
