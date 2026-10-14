/**
 * Context Budgeter for packaging agent MCP responses within explicit token limits.
 * Uses standard ~4 chars/token heuristic and attaches structured source citations.
 */

export interface SourceCitation {
  readonly file: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly symbol: string;
}

export interface BudgetedPacket {
  readonly text: string;
  readonly citations: readonly SourceCitation[];
  readonly estimatedTokens: number;
  readonly isTruncated: boolean;
  readonly itemsIncluded: number;
  readonly totalItems: number;
}

export interface FormattableItem {
  readonly citation: SourceCitation;
  readonly formattedBlock: string;
}

export class ContextBudgeter {
  /**
   * Standard estimation heuristic for code and markdown tokens (1 token ≈ 4 characters).
   */
  public static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Assembles a budgeted response with header, items, and citations within a strict token budget.
   * @param header Markdown header text
   * @param items Ranked list of formatted items to fit
   * @param maxTokens Maximum allowed estimated tokens (default: 4000)
   */
  public static assemble(
    header: string,
    items: readonly FormattableItem[],
    maxTokens = 4000,
  ): BudgetedPacket {
    let currentText = header.trim();
    const citations: SourceCitation[] = [];
    let itemsIncluded = 0;
    let isTruncated = false;

    for (const item of items) {
      const candidateBlock = currentText.length > 0 ? `\n\n${item.formattedBlock}` : item.formattedBlock;
      const candidateText = currentText + candidateBlock;
      const candidateTokens = ContextBudgeter.estimateTokens(candidateText);

      // Reserve 100 tokens for truncation warning if not last item
      const headroom = itemsIncluded < items.length - 1 ? 100 : 0;

      if (candidateTokens + headroom > maxTokens) {
        isTruncated = true;
        break;
      }

      currentText = candidateText;
      citations.push(item.citation);
      itemsIncluded++;
    }

    if (isTruncated) {
      const warning = `\n\n> ⚠ **[Token Budget Reached]** Showing ${itemsIncluded} of ${items.length} items. Narrow your query or increase tokenBudget for more results.`;
      currentText += warning;
    }

    return {
      text: currentText,
      citations,
      estimatedTokens: ContextBudgeter.estimateTokens(currentText),
      isTruncated,
      itemsIncluded,
      totalItems: items.length,
    };
  }
}
