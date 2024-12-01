import numpy as np

# Perceptron Learning Algorithm
def perceptron(X, y, learning_rate=0.1, epochs=10):
    # Initialize weights and bias
    weights = np.zeros(X.shape[1])  # One weight for each feature
    bias = 0

    # Training loop
    for epoch in range(epochs):
        for i in range(len(X)):
            # Calculate the output using the current weights and bias
            linear_output = np.dot(X[i], weights) + bias
            prediction = 1 if linear_output >= 0 else -1  # Activation function

            # Update weights and bias if there's an error
            if prediction != y[i]:
                weights += learning_rate * y[i] * X[i]
                bias += learning_rate * y[i]

    return weights, bias

# Example usage with a simple dataset
X = np.array([[2, 3], [4, 3], [1, 1], [3, 4]])  # Features
y = np.array([1, 1, -1, -1])  # Labels

weights, bias = perceptron(X, y)

print("Trained weights:", weights)
print("Trained bias:", bias)

