import { defineStore } from 'pinia'

export const useRoundsStore = defineStore('rounds', {
  state: () => ({
    rounds: [],
    questions: [],

    isLoading: false,
    isSaving: false,

    error: '',
  }),

  getters: {
    activeRounds(state) {
      return state.rounds
        .filter((round) => round.isActive)
        .sort((a, b) => {
          return a.sortOrder - b.sortOrder
        })
    },

    allRounds(state) {
      return [...state.rounds].sort((a, b) => {
        return a.sortOrder - b.sortOrder
      })
    },

    activeQuestions(state) {
      return state.questions
        .filter((question) => question.isActive)
        .sort((a, b) => {
          return a.sortOrder - b.sortOrder
        })
    },

    getRoundById: (state) => (roundId) => {
      return (
        state.rounds.find(
          (round) =>
            Number(round.id) === Number(roundId),
        ) || null
      )
    },

    getQuestionById: (state) => (questionId) => {
      return (
        state.questions.find(
          (question) =>
            Number(question.id) === Number(questionId),
        ) || null
      )
    },

    getQuestionsByRound: (state) => (roundId) => {
      return state.questions
        .filter(
          (question) =>
            Number(question.roundId) ===
            Number(roundId),
        )
        .sort((a, b) => {
          return a.sortOrder - b.sortOrder
        })
    },

    getActiveQuestionsByRound:
      (state) => (roundId) => {
        return state.questions
          .filter(
            (question) =>
              Number(question.roundId) ===
                Number(roundId) &&
              question.isActive,
          )
          .sort((a, b) => {
            return a.sortOrder - b.sortOrder
          })
      },
  },

  actions: {
    clearError() {
      this.error = ''
    },

    setError(error, fallbackMessage) {
      this.error =
        error instanceof Error
          ? error.message
          : fallbackMessage
    },

    async getErrorMessage(response, fallbackMessage) {
      try {
        const data = await response.json()

        return data.error || fallbackMessage
      } catch {
        return fallbackMessage
      }
    },

    async loadRounds() {
      this.isLoading = true
      this.clearError()

      try {
        const response = await fetch('/api/rounds', {
          headers: {
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          const message = await this.getErrorMessage(
            response,
            'Unable to load rounds.',
          )

          throw new Error(message)
        }

        const rounds = await response.json()

        this.rounds = Array.isArray(rounds)
          ? rounds
          : []

        return this.rounds
      } catch (error) {
        console.error('Failed to load rounds:', error)

        this.setError(
          error,
          'Unable to load rounds.',
        )

        throw error
      } finally {
        this.isLoading = false
      }
    },

    async loadQuestions(roundId = null) {
      this.isLoading = true
      this.clearError()

      try {
        const query = roundId
          ? `?roundId=${encodeURIComponent(roundId)}`
          : ''

        const response = await fetch(
          `/api/questions${query}`,
          {
            headers: {
              Accept: 'application/json',
            },
          },
        )

        if (!response.ok) {
          const message = await this.getErrorMessage(
            response,
            'Unable to load questions.',
          )

          throw new Error(message)
        }

        const questions = await response.json()

        if (roundId) {
          this.questions = [
            ...this.questions.filter(
              (question) =>
                Number(question.roundId) !==
                Number(roundId),
            ),
            ...(Array.isArray(questions)
              ? questions
              : []),
          ]
        } else {
          this.questions = Array.isArray(questions)
            ? questions
            : []
        }

        return questions
      } catch (error) {
        console.error(
          'Failed to load questions:',
          error,
        )

        this.setError(
          error,
          'Unable to load questions.',
        )

        throw error
      } finally {
        this.isLoading = false
      }
    },

    async loadQuizContent() {
      this.isLoading = true
      this.clearError()

      try {
        const [roundsResponse, questionsResponse] =
          await Promise.all([
            fetch('/api/rounds', {
              headers: {
                Accept: 'application/json',
              },
            }),

            fetch('/api/questions', {
              headers: {
                Accept: 'application/json',
              },
            }),
          ])

        if (!roundsResponse.ok) {
          const message = await this.getErrorMessage(
            roundsResponse,
            'Unable to load rounds.',
          )

          throw new Error(message)
        }

        if (!questionsResponse.ok) {
          const message = await this.getErrorMessage(
            questionsResponse,
            'Unable to load questions.',
          )

          throw new Error(message)
        }

        const [rounds, questions] =
          await Promise.all([
            roundsResponse.json(),
            questionsResponse.json(),
          ])

        this.rounds = Array.isArray(rounds)
          ? rounds
          : []

        this.questions = Array.isArray(questions)
          ? questions
          : []

        return {
          rounds: this.rounds,
          questions: this.questions,
        }
      } catch (error) {
        console.error(
          'Failed to load quiz content:',
          error,
        )

        this.setError(
          error,
          'Unable to load quiz content.',
        )

        throw error
      } finally {
        this.isLoading = false
      }
    },

    async addRound(roundData) {
      this.isSaving = true
      this.clearError()

      try {
        const response = await fetch('/api/rounds', {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify(roundData),
        })

        if (!response.ok) {
          const message = await this.getErrorMessage(
            response,
            'Unable to create the round.',
          )

          throw new Error(message)
        }

        const createdRound = await response.json()

        this.rounds.push(createdRound)

        return createdRound
      } catch (error) {
        console.error(
          'Failed to create round:',
          error,
        )

        this.setError(
          error,
          'Unable to create the round.',
        )

        throw error
      } finally {
        this.isSaving = false
      }
    },

    async updateRound(roundData) {
      this.isSaving = true
      this.clearError()

      try {
        const response = await fetch('/api/rounds', {
          method: 'PATCH',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify(roundData),
        })

        if (!response.ok) {
          const message = await this.getErrorMessage(
            response,
            'Unable to update the round.',
          )

          throw new Error(message)
        }

        const updatedRound = await response.json()

        const roundIndex = this.rounds.findIndex(
          (round) =>
            Number(round.id) ===
            Number(updatedRound.id),
        )

        if (roundIndex !== -1) {
          this.rounds.splice(
            roundIndex,
            1,
            updatedRound,
          )
        }

        return updatedRound
      } catch (error) {
        console.error(
          'Failed to update round:',
          error,
        )

        this.setError(
          error,
          'Unable to update the round.',
        )

        throw error
      } finally {
        this.isSaving = false
      }
    },

    async deleteRound(roundId) {
      this.isSaving = true
      this.clearError()

      try {
        const response = await fetch('/api/rounds', {
          method: 'DELETE',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            id: roundId,
          }),
        })

        if (!response.ok) {
          const message = await this.getErrorMessage(
            response,
            'Unable to delete the round.',
          )

          throw new Error(message)
        }

        this.rounds = this.rounds.filter(
          (round) =>
            Number(round.id) !== Number(roundId),
        )

        this.questions = this.questions.filter(
          (question) =>
            Number(question.roundId) !==
            Number(roundId),
        )

        return true
      } catch (error) {
        console.error(
          'Failed to delete round:',
          error,
        )

        this.setError(
          error,
          'Unable to delete the round.',
        )

        throw error
      } finally {
        this.isSaving = false
      }
    },

    async addQuestion(questionData) {
      this.isSaving = true
      this.clearError()

      try {
        const response = await fetch(
          '/api/questions',
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json',
            },

            body: JSON.stringify(questionData),
          },
        )

        if (!response.ok) {
          const message = await this.getErrorMessage(
            response,
            'Unable to create the question.',
          )

          throw new Error(message)
        }

        const createdQuestion =
          await response.json()

        this.questions.push(createdQuestion)

        await this.loadRounds()

        return createdQuestion
      } catch (error) {
        console.error(
          'Failed to create question:',
          error,
        )

        this.setError(
          error,
          'Unable to create the question.',
        )

        throw error
      } finally {
        this.isSaving = false
      }
    },

    async updateQuestion(questionData) {
      this.isSaving = true
      this.clearError()

      try {
        const response = await fetch(
          '/api/questions',
          {
            method: 'PATCH',

            headers: {
              'Content-Type': 'application/json',
            },

            body: JSON.stringify(questionData),
          },
        )

        if (!response.ok) {
          const message = await this.getErrorMessage(
            response,
            'Unable to update the question.',
          )

          throw new Error(message)
        }

        const updatedQuestion =
          await response.json()

        const questionIndex =
          this.questions.findIndex(
            (question) =>
              Number(question.id) ===
              Number(updatedQuestion.id),
          )

        if (questionIndex !== -1) {
          this.questions.splice(
            questionIndex,
            1,
            updatedQuestion,
          )
        }

        return updatedQuestion
      } catch (error) {
        console.error(
          'Failed to update question:',
          error,
        )

        this.setError(
          error,
          'Unable to update the question.',
        )

        throw error
      } finally {
        this.isSaving = false
      }
    },

    async deleteQuestion(questionId) {
      this.isSaving = true
      this.clearError()

      try {
        const response = await fetch(
          '/api/questions',
          {
            method: 'DELETE',

            headers: {
              'Content-Type': 'application/json',
            },

            body: JSON.stringify({
              id: questionId,
            }),
          },
        )

        if (!response.ok) {
          const message = await this.getErrorMessage(
            response,
            'Unable to delete the question.',
          )

          throw new Error(message)
        }

        this.questions = this.questions.filter(
          (question) =>
            Number(question.id) !==
            Number(questionId),
        )

        await this.loadRounds()

        return true
      } catch (error) {
        console.error(
          'Failed to delete question:',
          error,
        )

        this.setError(
          error,
          'Unable to delete the question.',
        )

        throw error
      } finally {
        this.isSaving = false
      }
    },
  },
})