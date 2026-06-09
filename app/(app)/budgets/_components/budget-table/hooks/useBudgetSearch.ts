import { useState, useEffect, useRef } from 'react';
import { DataGridHandle } from 'react-data-grid';
import { CombinedBudgetItem } from '../../../types';
import { Row } from '../types';

export function useBudgetSearch(
  processedData: CombinedBudgetItem[],
  rows: Row[],
  setCollapsedParents: React.Dispatch<React.SetStateAction<Set<string>>>,
  gridRef: React.RefObject<DataGridHandle | null>
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  
  const lastQueryForExpandRef = useRef<string>('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchMatches([]);
      setCurrentMatchId(null);
      lastQueryForExpandRef.current = '';
      return;
    }
    const query = searchQuery.toLowerCase();
    
    // Find all matches in the data tree
    const matches: string[] = [];
    processedData.forEach((parent: CombinedBudgetItem) => {
      if (parent.category.name.toLowerCase().includes(query)) {
        matches.push(parent.category.id);
      }
      if (parent.children) {
        parent.children.forEach((child: CombinedBudgetItem) => {
          if (child.category.name.toLowerCase().includes(query)) {
            matches.push(child.category.id);
          }
        });
      }
    });

    setSearchMatches(matches);

    // Auto-expand and select first match if query changed
    if (matches.length > 0) {
      if (lastQueryForExpandRef.current !== query) {
         lastQueryForExpandRef.current = query;
         setCurrentMatchId(matches[0] || null);
         
         setCollapsedParents(prev => {
           const next = new Set(prev);
           let changed = false;
           processedData.forEach((parent: CombinedBudgetItem) => {
             if (parent.children && parent.children.some((c: CombinedBudgetItem) => c.category.name.toLowerCase().includes(query))) {
               if (next.has(parent.category.id)) {
                 next.delete(parent.category.id);
                 changed = true;
               }
             }
           });
           return changed ? next : prev;
         });
      } else {
         setCurrentMatchId(prev => (prev && matches.includes(prev) ? prev : matches[0] || null));
      }
    } else {
      setCurrentMatchId(null);
    }
  }, [searchQuery, processedData, setCollapsedParents]);

  // Scroll effect
  useEffect(() => {
    if (!currentMatchId) return;
    const rowIdx = rows.findIndex(r => r.id === currentMatchId);
    if (rowIdx !== -1) {
      gridRef.current?.scrollToCell({ rowIdx, idx: 0 });
    }
  }, [currentMatchId, rows, gridRef]);

  const navigateToMatch = (matchId: string) => {
    setCurrentMatchId(matchId);
    setCollapsedParents(prev => {
      let changed = false;
      const next = new Set(prev);
      processedData.forEach((parent: CombinedBudgetItem) => {
        if (parent.children && parent.children.some((c: CombinedBudgetItem) => c.category.id === matchId)) {
          if (next.has(parent.category.id)) {
            next.delete(parent.category.id);
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const currentIndex = currentMatchId ? searchMatches.indexOf(currentMatchId) : -1;
    const nextIdx = (currentIndex + 1) % searchMatches.length;
    const nextId = searchMatches[nextIdx];
    if (nextId) navigateToMatch(nextId);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const currentIndex = currentMatchId ? searchMatches.indexOf(currentMatchId) : -1;
    const prevIdx = (currentIndex - 1 + searchMatches.length) % searchMatches.length;
    const prevId = searchMatches[prevIdx];
    if (prevId) navigateToMatch(prevId);
  };

  return {
    searchInput,
    setSearchInput,
    searchQuery,
    searchMatches,
    currentMatchId,
    handleNextMatch,
    handlePrevMatch
  };
}
