/**
 * Created by Holger Stitz on 13.01.2017.
 */

import {SimVisStateNode} from '../StateNode';
import {TreeNode} from './TreeNode';
import {StateTokenNode, IStateToken, IMatchedStateToken} from './StateToken';
import {SimCats} from '../SimilarityCategories';

export class MatchedTokenTree {
  private size:number = 0;
  private root:TreeNode = new TreeRoot(null, null, this.size++);

  private _leftState:SimVisStateNode = null;
  private _rightState:SimVisStateNode = null;

  constructor(left:SimVisStateNode, right:SimVisStateNode) {
    this._leftState = left;
    this._rightState = right;

    this.matchIntoNode(this.root, new StateTokenNode('dummyRoot', 1, left.stateTokens), new StateTokenNode('dummyRoot', 1, right.stateTokens));

    this.root.balanceWeights(1);
    this.root.setUnscaledSize(Array(SimCats.CATEGORIES.length).fill(1));
  }

  get leftState():SimVisStateNode {
    return this._leftState;
  }

  get rightState():SimVisStateNode {
    return this._rightState;
  }

  get rootNode():TreeNode {
    return this.root;
  }


  /**
   * Matches lists of tokens according to a venn diagram
   *
   * @param leftList
   * @param rightList
   * @returns {[IStateToken[],IMatchedStateToken[],IStateToken[]]}
   */
  private static matchTokens(leftList:IStateToken[], rightList:IStateToken[]) {
    const leftOnly = leftList.filter((left) => rightList.findIndex((right) => right.name === left.name) === -1);
    const rightOnly = rightList.filter((right) => leftList.findIndex((left) => right.name === left.name) === -1);

    const intersection:IMatchedStateToken[] = leftList
      .filter((left) => rightList.findIndex((right) => right.name === left.name) >= 0)
      .map((left, index) => ({left, right: rightList[index]}));

    return [leftOnly, intersection, rightOnly];
  }

  /**
   *
   * @param root
   * @param left
   * @param right
   */
  matchIntoNode(root:TreeNode, left:IStateToken, right:IStateToken) {
    if (left === null && right === null) {
      //nothing to do
      return;
    }

    if (left === null || right === null) {
      if (left === null && right.isLeaf === false) {
        right.children.forEach((child) => {
          const node = new TreeNode(null, child, this.size++);
          this.matchIntoNode(node, null, child); // recursion
          root.appendChild(node);
        });

      } else if (right === null && left.isLeaf === false) {
        left.children.forEach((child) => {
          const node = new TreeNode(child, null, this.size++);
          this.matchIntoNode(node, child, null); // recursion
          root.appendChild(node);
        });
      }

    } else {

      if (left.isLeaf || right.isLeaf) {
        return;
      }

      const [leftOnly, intersection, rightOnly] = MatchedTokenTree.matchTokens(left.children, right.children);

      (<IStateToken[]>leftOnly).forEach((left) => {
        const node = new TreeNode(left, null, this.size++);
        this.matchIntoNode(node, left, null); // recursion
        root.appendChild(node);
      });

      (<IMatchedStateToken[]>intersection).forEach((center) => {
        const node = new TreeNode(center.left, center.right, this.size++);
        this.matchIntoNode(node, center.left, center.right); // recursion
        root.appendChild(node);
      });

      (<IStateToken[]>rightOnly).forEach((right) => {
        const node = new TreeNode(null, right, this.size++);
        this.matchIntoNode(node, null, right); // recursion
        root.appendChild(node);
      });
    }
  }

  //not affected by weighting. Just delivers the correct proportions of leafs for each category.
  get similarityForLineup() {
    const catLength = SimCats.CATEGORIES.length;
    const leftTokens:IStateToken[] = this.leftState.stateTokens;
    const rightTokens:IStateToken[] = this.rightState.stateTokens;

    if (leftTokens.length === 0 && rightTokens.length === 0) {
      const fullWeight = Array(catLength).fill(1);
      return [fullWeight.slice(), fullWeight.slice(), fullWeight.slice()];
    }

    if (leftTokens.length === 0 || rightTokens.length === 0) {
      const noWeight = Array(catLength).fill(0);
      return [noWeight.slice(), noWeight.slice(), noWeight.slice()];
    }

    const leftSims = Array(catLength).fill(0);
    const centerSims = Array(catLength).fill(0);
    const rightSims = Array(catLength).fill(0);
    const catContainsToken:boolean[] = Array(catLength).fill(false);

    this.root.leaves.forEach((leaf) => {
      if (leaf.isPaired) {
        catContainsToken[leaf.category] = true;
        const sim = leaf.tokenSimilarity;
        centerSims[leaf.category] += leaf.importance * sim;
        leftSims[leaf.category] += leaf.importance * (1 - sim) / 2;
        rightSims[leaf.category] += leaf.importance * (1 - sim) / 2;
      } else {
        if (leaf.hasLeftToken) {
          catContainsToken[leaf.category] = true;
          leftSims[leaf.category] += leaf.importance;
        } else {
          catContainsToken[leaf.category] = true;
          rightSims[leaf.category] += leaf.importance;
        }
      }
    });

    let total = 0;
    for (let i = 0; i < catLength; i++) {
      if (catContainsToken[i]) {
        total = 0;
        total += leftSims[i];
        total += centerSims[i];
        total += rightSims[i];
        leftSims[i] = leftSims[i] / total;
        centerSims[i] = centerSims[i] / total;
        rightSims[i] = rightSims[i] / total;
      } else {
        centerSims[i] = 1;
      }
    }

    return [leftSims, centerSims, rightSims];
  }


  get similarityPerCategory() {
    const sims = Array(SimCats.CATEGORIES.length);
    const total = Array(SimCats.CATEGORIES.length);

    this.root.leaves.forEach((leaf) => {
      total[leaf.category] += leaf.importance;
      sims[leaf.category] += leaf.isPaired ? leaf.importance * leaf.tokenSimilarity : 0;
    });

    return sims.map((similarity, index) => {
      return (total[index] === 0) ? 1 : (similarity / total[index]);
    });
  }

  get similarity() {
    const sims = this.similarityPerCategory;
    let sim = 0;
    SimCats.getWeights()
      .forEach((weight, i) => {
        sim += (sims[i] === 0) ? (weight / 100) : (sims[i] * weight / 100);
      });
    return sim;
  }
}


class TreeRoot extends TreeNode {

  constructor(left, right, id) {
    super(left, right, id);
  }

  get isLeafNode():boolean {
    return false;
  }

  get isRoot():boolean {
    return true;
  }

}