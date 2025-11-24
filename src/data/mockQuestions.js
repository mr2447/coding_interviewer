export const mockQuestions = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
        explanation: ""
      }
    ],
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i] ≤ 10⁹",
      "-10⁹ ≤ target ≤ 10⁹",
      "Only one valid answer exists."
    ],
    hints: [
      "A really brute force way would be to search for all possible pairs of numbers but that would be too slow.",
      "So, we can reduce the look up time from O(n) to O(1) by trading space for speed.",
      "A hash map is well suited for this purpose since it supports fast look up in near constant time."
    ]
  },
  {
    id: 2,
    title: "Valid Parentheses",
    difficulty: "Easy",
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: "s = \"()\"",
        output: "true",
        explanation: ""
      },
      {
        input: "s = \"()[]{}\"",
        output: "true",
        explanation: ""
      },
      {
        input: "s = \"(]\"",
        output: "false",
        explanation: ""
      }
    ],
    constraints: [
      "1 ≤ s.length ≤ 10⁴",
      "s consists of parentheses only '()[]{}'."
    ],
    hints: [
      "Use a stack to keep track of opening brackets.",
      "When you encounter a closing bracket, check if it matches the most recent opening bracket.",
      "If the stack is empty when you encounter a closing bracket, the string is invalid."
    ]
  },
  {
    id: 3,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    description: `Given a string s, find the length of the longest substring without repeating characters.`,
    examples: [
      {
        input: "s = \"abcabcbb\"",
        output: "3",
        explanation: "The answer is \"abc\", with the length of 3."
      },
      {
        input: "s = \"bbbbb\"",
        output: "1",
        explanation: "The answer is \"b\", with the length of 1."
      },
      {
        input: "s = \"pwwkew\"",
        output: "3",
        explanation: "The answer is \"wke\", with the length of 3."
      }
    ],
    constraints: [
      "0 ≤ s.length ≤ 5 * 10⁴",
      "s consists of English letters, digits, symbols and spaces."
    ],
    hints: [
      "Use a sliding window approach with two pointers.",
      "Use a hash set to track characters in the current window.",
      "When you encounter a duplicate, move the left pointer until the duplicate is removed."
    ]
  },
  {
    id: 4,
    title: "Reverse Linked List",
    difficulty: "Easy",
    description: `Given the head of a singly linked list, reverse the list, and return the reversed list.`,
    examples: [
      {
        input: "head = [1,2,3,4,5]",
        output: "[5,4,3,2,1]",
        explanation: ""
      },
      {
        input: "head = [1,2]",
        output: "[2,1]",
        explanation: ""
      },
      {
        input: "head = []",
        output: "[]",
        explanation: ""
      }
    ],
    constraints: [
      "The number of nodes in the list is the range [0, 5000].",
      "-5000 ≤ Node.val ≤ 5000"
    ],
    hints: [
      "You can solve this iteratively or recursively.",
      "For iterative approach, use three pointers: prev, curr, and next.",
      "For recursive approach, reverse the rest of the list first, then reverse the current node."
    ]
  },
  {
    id: 5,
    title: "Binary Tree Inorder Traversal",
    difficulty: "Easy",
    description: `Given the root of a binary tree, return the inorder traversal of its nodes' values.`,
    examples: [
      {
        input: "root = [1,null,2,3]",
        output: "[1,3,2]",
        explanation: ""
      },
      {
        input: "root = []",
        output: "[]",
        explanation: ""
      },
      {
        input: "root = [1]",
        output: "[1]",
        explanation: ""
      }
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 100].",
      "-100 ≤ Node.val ≤ 100"
    ],
    hints: [
      "Inorder traversal: left -> root -> right",
      "You can solve this recursively or iteratively using a stack.",
      "For iterative approach, use a stack to simulate the recursion."
    ]
  }
];

