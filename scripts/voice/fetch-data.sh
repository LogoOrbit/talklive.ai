#!/bin/bash
# Fetches the public speech corpora the voice model is trained and tested on.
#
#   bash scripts/voice/fetch-data.sh <data-dir>
#
# Resumable: every finished piece leaves a marker file, and a re-run skips it.
# A download that is cut off is retried; a marker is written only after the
# whole transfer (and, for archives, the unpacking) went through.
#
# Layout it produces (what scripts/voice/manifest.js reads):
#   <data-dir>/libri/LibriSpeech/{dev-clean,dev-other,test-clean,test-other}
#   <data-dir>/fleurs/<lang>/{train,dev,test}/*.wav  and  <split>.tsv
#
# Disk: about 25 GB while running (LibriSpeech archives, FLEURS dev/test
# archives that are deleted after unpacking). The FLEURS train archives are
# 1+ GB each, so they are streamed and only a balanced sample (up to 260
# women + 260 men per language, about 0.2 GB) is written to disk.
set -o pipefail

DATA=${1:?usage: fetch-data.sh <data-dir>}
mkdir -p "$DATA"
cd "$DATA" || exit 1

HF=https://huggingface.co/datasets/google/fleurs/resolve/main/data
OSLR=https://www.openslr.org/resources/12

# FLEURS languages whose dev split is used (validation, and training for
# languages that have no train sample below).
DEV="en_us ur_pk hi_in bn_in pa_in ta_in te_in ar_eg fa_ir tr_tr id_id fil_ph vi_vn es_419 pt_br fr_fr de_de ru_ru sw_ke ha_ng cmn_hans_cn ja_jp ko_kr ne_np"
# Languages kept completely apart for the final test (test split only). ms_my and th_th are also
# in TRAIN_EXTRA (train split only): their test split is then "seen language, unseen recordings".
HELD="ps_af mr_in it_it ms_my yo_ng th_th am_et sd_in"
# Languages whose (large) train split is sampled, balanced by gender.
TRAIN="ur_pk hi_in bn_in pa_in ta_in ar_eg fa_ir tr_tr id_id vi_vn es_419 pt_br fr_fr ru_ru sw_ke en_us"
# Added for weak groups (Southeast Asia: Malay, Filipino, Thai; and languages with many men in train):
TRAIN_EXTRA="ms_my th_th fil_ph ko_kr ne_np ha_ng cmn_hans_cn te_in de_de"
PER_GENDER=260
TRIES=5

# Plain download to a file, resuming a partial one. Returns non-zero if the
# transfer never completed.
download() { # url file
  local i
  for i in $(seq "$TRIES"); do
    curl -sS -L -C - -m 3600 --retry 3 -o "$2" "$1" && return 0
    echo "retry $i: $1" >&2
    sleep $((i * 10))
  done
  return 1
}

# LibriSpeech (CC BY 4.0): dev-clean/dev-other for training and validation,
# test-clean/test-other for the final test. SPEAKERS.TXT has each speaker's sex.
mkdir -p libri
for part in dev-clean dev-other test-clean test-other; do
  [ -f "libri/$part.done" ] && continue
  if download "$OSLR/$part.tar.gz" "libri/$part.tar.gz" && tar -xzf "libri/$part.tar.gz" -C libri; then
    rm -f "libri/$part.tar.gz"; touch "libri/$part.done"; echo "done libri $part"
  else
    echo "FAILED libri $part (partial archive kept; re-run to resume)" >&2
    rm -f "libri/$part.tar.gz"  # a corrupt archive cannot be resumed safely
  fi
done

tsv() { # lang split
  mkdir -p "fleurs/$1"
  [ -s "fleurs/$1/$2.tsv" ] || download "$HF/$1/$2.tsv" "fleurs/$1/$2.tsv"
}

# FLEURS (CC BY 4.0) dev and test splits: ordinary archives, unpacked then deleted.
get_split() { # lang split
  local l=$1 s=$2
  tsv "$l" "$s" || { echo "FAILED tsv $l $s" >&2; return 1; }
  [ -f "fleurs/$l/$s.done" ] && return 0
  local tar=fleurs/$l/$s.tar.gz
  # A leftover archive might be a truncated one: resume, then test it.
  if download "$HF/$l/audio/$s.tar.gz" "$tar" && gzip -t "$tar" 2>/dev/null; then
    mkdir -p "fleurs/$l/$s"
    if tar -xzf "$tar" -C "fleurs/$l/$s"; then rm -f "$tar"; touch "fleurs/$l/$s.done"; echo "done $l $s"; return 0; fi
  fi
  rm -f "$tar"
  echo "FAILED $l $s" >&2
  return 1
}

# FLEURS train split, balanced sample, streamed straight into tar.
get_train() { # lang
  local l=$1 g i
  [ -f "fleurs/$l/train.done" ] && return 0
  tsv "$l" train || { echo "FAILED tsv $l train" >&2; return 1; }
  mkdir -p "fleurs/$l/train"
  # Fixed random source: the same files are picked on every run.
  for g in FEMALE MALE; do
    awk -F'\t' -v g=$g '$NF==g {print $2}' "fleurs/$l/train.tsv" | sort -u | shuf -n "$PER_GENDER" --random-source=<(yes)
  done | sed 's#^#train/#' > "fleurs/$l/train.list"
  for i in $(seq "$TRIES"); do
    # pipefail: the marker is written only if curl AND tar both finished.
    if curl -sS -L -m 3600 --retry 3 "$HF/$l/audio/train.tar.gz" | tar -xz -C "fleurs/$l/train" --files-from="fleurs/$l/train.list" 2> "fleurs/$l/train.err"; then
      touch "fleurs/$l/train.done"
      echo "done $l train files=$(find "fleurs/$l/train" -name '*.wav' | wc -l)"
      return 0
    fi
    echo "retry $i: $l train stream" >&2
    sleep $((i * 10))
  done
  echo "FAILED $l train" >&2
  return 1
}

for l in $DEV; do get_split "$l" dev; done
for l in $HELD; do get_split "$l" test; done
for l in $TRAIN $TRAIN_EXTRA; do get_train "$l"; done
echo FETCH-FINISHED
