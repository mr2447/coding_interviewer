// Mock OpenAI API function that simulates responses
export const mockOpenAIResponse = async (userMessage, codeContent) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  // Generate mock responses based on message content
  const message = userMessage.toLowerCase();
  
  if (message.includes('hint') || message.includes('help')) {
    return {
      role: 'assistant',
      content: `Here's a hint: Try using a hash map or two-pointer technique. Looking at your current code, I notice you're on the right track. Consider optimizing the time complexity by reducing nested loops.`
    };
  }
  
  if (message.includes('complexity') || message.includes('time') || message.includes('space')) {
    return {
      role: 'assistant',
      content: `Your current solution has a time complexity of O(n²) in the worst case. You can optimize this to O(n) by using a hash map. The space complexity would be O(n) for storing the hash map.`
    };
  }
  
  if (message.includes('bug') || message.includes('error') || message.includes('wrong')) {
    return {
      role: 'assistant',
      content: `I see a potential issue in your code. Make sure to handle edge cases like empty arrays or null values. Also, check your loop boundaries - you might be going out of bounds.`
    };
  }
  
  if (message.includes('test') || message.includes('example')) {
    return {
      role: 'assistant',
      content: `Let's trace through the first example: For input [2,7,11,15] with target 9, your code should find indices [0,1] since nums[0] + nums[1] = 2 + 7 = 9.`
    };
  }
  
  if (codeContent && codeContent.length < 50) {
    return {
      role: 'assistant',
      content: `I see you're just getting started. Here's a suggestion: Start by iterating through the array and for each element, check if its complement (target - current element) exists in the array.`
    };
  }
  
  // Default response
  const responses = [
    `That's a good approach! Your code looks clean. One suggestion: consider adding comments to explain your logic, especially for the hash map operations.`,
    `I can see you're using a brute force approach. While this works, you could optimize it using a hash map to reduce the time complexity from O(n²) to O(n).`,
    `Your solution handles the basic case well. Don't forget to consider edge cases like when the array has fewer than 2 elements or when no solution exists.`,
    `Good progress! The logic is sound. You might want to add some input validation and error handling to make your code more robust.`,
    `I notice you're on the right track. Consider using a more efficient data structure to improve performance. A hash map would be perfect for this problem.`
  ];
  
  return {
    role: 'assistant',
    content: responses[Math.floor(Math.random() * responses.length)]
  };
};

