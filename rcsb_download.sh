#!/usr/bin/env bash

# Script to download files from RCSB PDB file download services.
# Supports PDB id lists separated by commas, whitespace, and/or newlines.

set -u

if ! command -v curl &> /dev/null; then
  echo "'curl' could not be found. You need to install 'curl' for this script to work." >&2
  exit 1
fi

PROGNAME=$0
BASE_URL="https://files.rcsb.org/download"

usage() {
  cat << EOF >&2
Usage: $PROGNAME -f <file> [-o <dir>] [-c] [-p] [-a] [-A] [-x] [-s] [-m] [-r]

 -f <file>: the input file containing a list of PDB ids (comma/space/newline separated)
 -o  <dir>: the output dir, default: current dir
 -c       : download a cif.gz file for each PDB id
 -p       : download a pdb.gz file for each PDB id (not available for large structures)
 -a       : download a pdb1.gz file (1st bioassembly) for each PDB id (not available for large structures)
 -A       : download an assembly1.cif.gz file (1st bioassembly) for each PDB id
 -x       : download a xml.gz file for each PDB id
 -s       : download a sf.cif.gz file for each PDB id (diffraction only)
 -m       : download a mr.gz file for each PDB id (NMR only)
 -r       : download a mr.str.gz for each PDB id (NMR only)

Examples:
  echo "1CRN, 4HHB" > ids.txt
  $PROGNAME -f ids.txt -c -o structures
EOF
  exit 1
}

download() {
  local filename="$1"
  local outdir="$2"
  local url="$BASE_URL/$filename"
  local out="$outdir/$filename"

  echo "Downloading $url -> $out"
  # -f fail on server errors, -L follow redirects, -sS keep errors visible
  if ! curl -fLsS "$url" -o "$out"; then
    echo "Failed to download $url" >&2
    return 1
  fi
}

listfile=""
outdir="."
cif=false
pdb=false
pdb1=false
cifassembly1=false
xml=false
sf=false
mr=false
mrstr=false

while getopts f:o:cpaAxsmr opt; do
  case "$opt" in
    f) listfile="$OPTARG";;
    o) outdir="$OPTARG";;
    c) cif=true;;
    p) pdb=true;;
    a) pdb1=true;;
    A) cifassembly1=true;;
    x) xml=true;;
    s) sf=true;;
    m) mr=true;;
    r) mrstr=true;;
    *) usage;;
  esac
done
shift "$((OPTIND - 1))"

if [[ -z "$listfile" ]]; then
  echo "Parameter -f must be provided" >&2
  exit 1
fi

if [[ ! -f "$listfile" ]]; then
  echo "Input file not found: $listfile" >&2
  exit 1
fi

# If no format switches were provided, default to mmCIF.
if [[ "$cif" == false && "$pdb" == false && "$pdb1" == false && "$cifassembly1" == false && "$xml" == false && "$sf" == false && "$mr" == false && "$mrstr" == false ]]; then
  cif=true
fi

mkdir -p "$outdir"

# Normalize separators: commas/newlines/tabs/spaces -> one-per-line
# Trim whitespace, drop empties, uppercase IDs.
ids=$(tr ',\t\r ' '\n' < "$listfile" | sed -e 's/^\s\+//; s/\s\+$//' | sed '/^$/d' | tr '[:lower:]' '[:upper:]')

if [[ -z "$ids" ]]; then
  echo "No PDB ids found in file: $listfile" >&2
  exit 1
fi

while IFS= read -r token; do
  [[ -z "$token" ]] && continue

  if [[ "$cif" == true ]]; then
    download "${token}.cif.gz" "$outdir" || true
  fi
  if [[ "$pdb" == true ]]; then
    download "${token}.pdb.gz" "$outdir" || true
  fi
  if [[ "$pdb1" == true ]]; then
    download "${token}.pdb1.gz" "$outdir" || true
  fi
  if [[ "$cifassembly1" == true ]]; then
    download "${token}-assembly1.cif.gz" "$outdir" || true
  fi
  if [[ "$xml" == true ]]; then
    download "${token}.xml.gz" "$outdir" || true
  fi
  if [[ "$sf" == true ]]; then
    download "${token}-sf.cif.gz" "$outdir" || true
  fi
  if [[ "$mr" == true ]]; then
    download "${token}.mr.gz" "$outdir" || true
  fi
  if [[ "$mrstr" == true ]]; then
    download "${token}_mr.str.gz" "$outdir" || true
  fi

done <<< "$ids"
