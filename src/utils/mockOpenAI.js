// Mock OpenAI API function that simulates hint generation
export const mockOpenAIResponse = async (codeContent, previousHints = '') => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  const hasCode = codeContent && codeContent.trim().length > 0;
  const hasPreviousHints = previousHints && previousHints.trim().length > 0;
  
  // If no code has been written yet
  if (!hasCode) {
    return {
      role: 'assistant',
      content: `Start by writing some code in the editor. Once you have some code written, I can provide more specific hints based on your implementation!`
    };
  }
  
  // If there are previous hints, generate a more advanced/progressive hint
  if (hasPreviousHints) {
    const advancedHints = [
      `Building on the previous hint: Consider using a two-pointer approach starting from both ends of the array. This can help you find the solution in O(n) time.`,
      `Here's another approach: You might want to preprocess your data structure. Try sorting the array first, which will open up more efficient algorithms.`,
      `Think about edge cases: What happens when the input is empty? Or when multiple solutions exist? Make sure your code handles all scenarios.`,
      `Optimization tip: Instead of checking every possible pair, use a hash map to store what you've seen so far. This reduces lookups to O(1).`,
      `Consider the space-time tradeoff: You can reduce time complexity by using more space, or optimize space by accepting a slower algorithm.`,
      `Take a closer look at your loop structure. There might be a way to eliminate nested iterations and improve efficiency.`,
      `Have you considered using a sliding window technique? This pattern works well for many array problems.`
    ];
    return {
      role: 'assistant',
      content: advancedHints[Math.floor(Math.random() * advancedHints.length)]
    };
  }
  
  // First hint - more general and encouraging
  const firstHints = [
    `Here's a hint: Try using a hash map or dictionary to store values as you iterate. This can help you solve this problem in linear time.`,
    `Start by thinking about what data structure would help you quickly look up values you've already seen during iteration.`,
    `Consider using a two-pointer technique if the input array is sorted. This is a common pattern for array problems.`,
    `Think about what you need to track as you iterate through the array. What information would help you solve this efficiently?`,
    `A common approach is to trade space for time - use extra memory to store intermediate results and speed up your algorithm.`,
    `Look at your current code structure. Consider breaking the problem down into smaller subproblems that you can solve independently.`
  ];
  
  return {
    role: 'assistant',
    content: firstHints[Math.floor(Math.random() * firstHints.length)]
  };
};

