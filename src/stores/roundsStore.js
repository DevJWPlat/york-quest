import { defineStore } from 'pinia'

export const useRoundsStore = defineStore('rounds', {
  state: () => ({
    rounds: [],
    questions: [],
    tieBreakers: [],

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
            Number(question.id) ===
            Number(questionId),
        ) || null
      )
    },

    getTieBreakerById:
      (state) => (tieBreakerId) => {
        return (
          state.tieBreakers.find(
            (tieBreaker) =>
              Number(tieBreaker.id) ===
              Number(tieBreakerId),
          ) || null
        )
      },

    getTieBreakerByRound:
      (state) => (roundId) => {
        return (
          state.tieBreakers.find(
            (tieBreaker) =>
              Number(tieBreaker.roundId) ===
              Number(roundId),
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

    async getErrorMessage(
      response,
      fallbackMessage,
    ) {
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
        const response = await fetch(
          '/api/rounds',
          {
            headers: {
              Accept: 'application/json',
            },
          },
        )

        if (!response.ok) {
          const message =
            await this.getErrorMessage(
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
        console.error(
          'Failed to load rounds:',
          error,
        )

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
          ? `?roundId=${encodeURIComponent(
              roundId,
            )}`
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
          const message =
            await this.getErrorMessage(
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
          this.questions = Array.isArray(
            questions,
          )
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

    async loadTieBreakers(roundId = null) {
      this.clearError()

      try {
        const query = roundId
          ? `?roundId=${encodeURIComponent(
              roundId,
            )}`
          : ''

        const response = await fetch(
          `/api/tie-breakers${query}`,
          {
            headers: {
              Accept: 'application/json',
            },
          },
        )

        if (!response.ok) {
          const message =
            await this.getErrorMessage(
              response,
              'Unable to load tie-breakers.',
            )

          throw new Error(message)
        }

        const data = await response.json()

        if (roundId) {
          this.tieBreakers =
            this.tieBreakers.filter(
              (tieBreaker) =>
                Number(
                  tieBreaker.roundId,
                ) !== Number(roundId),
            )

          if (data) {
            this.tieBreakers.push(data)
          }
        } else {
          this.tieBreakers = Array.isArray(
            data,
          )
            ? data
            : []
        }

        return data
      } catch (error) {
        console.error(
          'Failed to load tie-breakers:',
          error,
        )

        this.setError(
          error,
          'Unable to load tie-breakers.',
        )

        throw error
      }
    },

    async loadQuizContent() {
      this.isLoading = true
      this.clearError()

      try {
        const [
          roundsResponse,
          questionsResponse,
          tieBreakersResponse,
        ] = await Promise.all([
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

          fetch('/api/tie-breakers', {
            headers: {
              Accept: 'application/json',
            },
          }),
        ])

        if (!roundsResponse.ok) {
          const message =
            await this.getErrorMessage(
              roundsResponse,
              'Unable to load rounds.',
            )

          throw new Error(message)
        }

        if (!questionsResponse.ok) {
          const message =
            await this.getErrorMessage(
              questionsResponse,
              'Unable to load questions.',
            )

          throw new Error(message)
        }

        if (!tieBreakersResponse.ok) {
          const message =
            await this.getErrorMessage(
              tieBreakersResponse,
              'Unable to load tie-breakers.',
            )

          throw new Error(message)
        }

        const [
          rounds,
          questions,
          tieBreakers,
        ] = await Promise.all([
          roundsResponse.json(),
          questionsResponse.json(),
          tieBreakersResponse.json(),
        ])

        this.rounds = Array.isArray(rounds)
          ? rounds
          : []

        this.questions = Array.isArray(
          questions,
        )
          ? questions
          : []

        this.tieBreakers = Array.isArray(
          tieBreakers,
        )
          ? tieBreakers
          : []

        return {
          rounds: this.rounds,
          questions: this.questions,
          tieBreakers: this.tieBreakers,
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

    async moveRound(roundId, direction) {
      if (this.isSaving) {
        return false
      }

      const orderedRounds = this.allRounds

      const currentIndex =
        orderedRounds.findIndex(
          (round) =>
            Number(round.id) ===
            Number(roundId),
        )

      if (currentIndex === -1) {
        throw new Error('Round not found.')
      }

      const targetIndex =
        direction === 'up'
          ? currentIndex - 1
          : currentIndex + 1

      if (
        targetIndex < 0 ||
        targetIndex >= orderedRounds.length
      ) {
        return false
      }

      const currentRound =
        orderedRounds[currentIndex]

      const targetRound =
        orderedRounds[targetIndex]

      const currentSortOrder = Number(
        currentRound.sortOrder,
      )

      const targetSortOrder = Number(
        targetRound.sortOrder,
      )

      this.isSaving = true
      this.clearError()

      try {
        const [
          currentResponse,
          targetResponse,
        ] = await Promise.all([
          fetch('/api/rounds', {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: currentRound.id,
              sortOrder: targetSortOrder,
            }),
          }),

          fetch('/api/rounds', {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: targetRound.id,
              sortOrder: currentSortOrder,
            }),
          }),
        ])

        if (!currentResponse.ok) {
          const message =
            await this.getErrorMessage(
              currentResponse,
              'Unable to reorder the round.',
            )

          throw new Error(message)
        }

        if (!targetResponse.ok) {
          const message =
            await this.getErrorMessage(
              targetResponse,
              'Unable to reorder the round.',
            )

          throw new Error(message)
        }

        const [
          updatedCurrentRound,
          updatedTargetRound,
        ] = await Promise.all([
          currentResponse.json(),
          targetResponse.json(),
        ])

        const currentStoreIndex =
          this.rounds.findIndex(
            (round) =>
              Number(round.id) ===
              Number(
                updatedCurrentRound.id,
              ),
          )

        const targetStoreIndex =
          this.rounds.findIndex(
            (round) =>
              Number(round.id) ===
              Number(updatedTargetRound.id),
          )

        if (currentStoreIndex !== -1) {
          this.rounds.splice(
            currentStoreIndex,
            1,
            updatedCurrentRound,
          )
        }

        if (targetStoreIndex !== -1) {
          this.rounds.splice(
            targetStoreIndex,
            1,
            updatedTargetRound,
          )
        }

        return true
      } catch (error) {
        console.error(
          'Failed to reorder round:',
          error,
        )

        this.setError(
          error,
          'Unable to reorder the round.',
        )

        try {
          await this.loadRounds()
        } catch {
          // Preserve the original error.
        }

        throw error
      } finally {
        this.isSaving = false
      }
    },

    async moveQuestion(
      questionId,
      direction,
    ) {
      if (this.isSaving) {
        return false
      }

      const question =
        this.getQuestionById(questionId)

      if (!question) {
        throw new Error(
          'Question not found.',
        )
      }

      const orderedQuestions =
        this.getQuestionsByRound(
          question.roundId,
        )

      const currentIndex =
        orderedQuestions.findIndex(
          (item) =>
            Number(item.id) ===
            Number(questionId),
        )

      if (currentIndex === -1) {
        throw new Error(
          'Question not found.',
        )
      }

      const targetIndex =
        direction === 'up'
          ? currentIndex - 1
          : currentIndex + 1

      if (
        targetIndex < 0 ||
        targetIndex >=
          orderedQuestions.length
      ) {
        return false
      }

      const currentQuestion =
        orderedQuestions[currentIndex]

      const targetQuestion =
        orderedQuestions[targetIndex]

      const currentSortOrder = Number(
        currentQuestion.sortOrder,
      )

      const targetSortOrder = Number(
        targetQuestion.sortOrder,
      )

      this.isSaving = true
      this.clearError()

      try {
        const [
          currentResponse,
          targetResponse,
        ] = await Promise.all([
          fetch('/api/questions', {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: currentQuestion.id,
              sortOrder: targetSortOrder,
            }),
          }),

          fetch('/api/questions', {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: targetQuestion.id,
              sortOrder: currentSortOrder,
            }),
          }),
        ])

        if (!currentResponse.ok) {
          const message =
            await this.getErrorMessage(
              currentResponse,
              'Unable to reorder the question.',
            )

          throw new Error(message)
        }

        if (!targetResponse.ok) {
          const message =
            await this.getErrorMessage(
              targetResponse,
              'Unable to reorder the question.',
            )

          throw new Error(message)
        }

        const [
          updatedCurrentQuestion,
          updatedTargetQuestion,
        ] = await Promise.all([
          currentResponse.json(),
          targetResponse.json(),
        ])

        const currentStoreIndex =
          this.questions.findIndex(
            (item) =>
              Number(item.id) ===
              Number(
                updatedCurrentQuestion.id,
              ),
          )

        const targetStoreIndex =
          this.questions.findIndex(
            (item) =>
              Number(item.id) ===
              Number(
                updatedTargetQuestion.id,
              ),
          )

        if (currentStoreIndex !== -1) {
          this.questions.splice(
            currentStoreIndex,
            1,
            updatedCurrentQuestion,
          )
        }

        if (targetStoreIndex !== -1) {
          this.questions.splice(
            targetStoreIndex,
            1,
            updatedTargetQuestion,
          )
        }

        return true
      } catch (error) {
        console.error(
          'Failed to reorder question:',
          error,
        )

        this.setError(
          error,
          'Unable to reorder the question.',
        )

        try {
          await this.loadQuestions(
            question.roundId,
          )
        } catch {
          // Preserve the original error.
        }

        throw error
      } finally {
        this.isSaving = false
      }
    },

    async addRound(roundData) {
      this.isSaving = true
      this.clearError()

      try {
        const response = await fetch(
          '/api/rounds',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(roundData),
          },
        )

        if (!response.ok) {
          const message =
            await this.getErrorMessage(
              response,
              'Unable to create the round.',
            )

          throw new Error(message)
        }

        const createdRound =
          await response.json()

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
        const response = await fetch(
          '/api/rounds',
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(roundData),
          },
        )

        if (!response.ok) {
          const message =
            await this.getErrorMessage(
              response,
              'Unable to update the round.',
            )

          throw new Error(message)
        }

        const updatedRound =
          await response.json()

        const roundIndex =
          this.rounds.findIndex(
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
        const response = await fetch(
          '/api/rounds',
          {
            method: 'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: roundId,
            }),
          },
        )

        if (!response.ok) {
          const message =
            await this.getErrorMessage(
              response,
              'Unable to delete the round.',
            )

          throw new Error(message)
        }

        this.rounds = this.rounds.filter(
          (round) =>
            Number(round.id) !==
            Number(roundId),
        )

        this.questions =
          this.questions.filter(
            (question) =>
              Number(question.roundId) !==
              Number(roundId),
          )

        this.tieBreakers =
          this.tieBreakers.filter(
            (tieBreaker) =>
              Number(tieBreaker.roundId) !==
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
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              questionData,
            ),
          },
        )

        if (!response.ok) {
          const message =
            await this.getErrorMessage(
              response,
              'Unable to create the question.',
            )

          throw new Error(message)
        }

        const createdQuestion =
          await response.json()

        this.questions.push(
          createdQuestion,
        )

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
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              questionData,
            ),
          },
        )

        if (!response.ok) {
          const message =
            await this.getErrorMessage(
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
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: questionId,
            }),
          },
        )

        if (!response.ok) {
          const message =
            await this.getErrorMessage(
              response,
              'Unable to delete the question.',
            )

          throw new Error(message)
        }

        this.questions =
          this.questions.filter(
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

    async addTieBreaker(tieBreakerData) {
      if (this.isSaving) {
        return null
      }

      this.isSaving = true
      this.clearError()

      try {
        const response = await fetch(
          '/api/tie-breakers',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              tieBreakerData,
            ),
          },
        )

        if (!response.ok) {
          const message =
            await this.getErrorMessage(
              response,
              'Unable to create the tie-breaker.',
            )

          throw new Error(message)
        }

        const createdTieBreaker =
          await response.json()

        this.tieBreakers =
          this.tieBreakers.filter(
            (tieBreaker) =>
              Number(tieBreaker.roundId) !==
              Number(
                createdTieBreaker.roundId,
              ),
          )

        this.tieBreakers.push(
          createdTieBreaker,
        )

        return createdTieBreaker
      } catch (error) {
        console.error(
          'Failed to create tie-breaker:',
          error,
        )

        this.setError(
          error,
          'Unable to create the tie-breaker.',
        )

        throw error
      } finally {
        this.isSaving = false
      }
    },

    async updateTieBreaker(
      tieBreakerData,
    ) {
      if (this.isSaving) {
        return null
      }

      this.isSaving = true
      this.clearError()

      try {
        const response = await fetch(
          '/api/tie-breakers',
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              tieBreakerData,
            ),
          },
        )

        if (!response.ok) {
          const message =
            await this.getErrorMessage(
              response,
              'Unable to update the tie-breaker.',
            )

          throw new Error(message)
        }

        const updatedTieBreaker =
          await response.json()

        const tieBreakerIndex =
          this.tieBreakers.findIndex(
            (tieBreaker) =>
              Number(tieBreaker.id) ===
              Number(
                updatedTieBreaker.id,
              ),
          )

        if (tieBreakerIndex === -1) {
          this.tieBreakers.push(
            updatedTieBreaker,
          )
        } else {
          this.tieBreakers.splice(
            tieBreakerIndex,
            1,
            updatedTieBreaker,
          )
        }

        return updatedTieBreaker
      } catch (error) {
        console.error(
          'Failed to update tie-breaker:',
          error,
        )

        this.setError(
          error,
          'Unable to update the tie-breaker.',
        )

        throw error
      } finally {
        this.isSaving = false
      }
    },

    async deleteTieBreaker(
      tieBreakerId,
    ) {
      if (this.isSaving) {
        return null
      }

      this.isSaving = true
      this.clearError()

      try {
        const response = await fetch(
          '/api/tie-breakers',
          {
            method: 'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: tieBreakerId,
            }),
          },
        )

        if (!response.ok) {
          const message =
            await this.getErrorMessage(
              response,
              'Unable to delete the tie-breaker.',
            )

          throw new Error(message)
        }

        const data = await response.json()

        this.tieBreakers =
          this.tieBreakers.filter(
            (tieBreaker) =>
              Number(tieBreaker.id) !==
              Number(tieBreakerId),
          )

        return data
      } catch (error) {
        console.error(
          'Failed to delete tie-breaker:',
          error,
        )

        this.setError(
          error,
          'Unable to delete the tie-breaker.',
        )

        throw error
      } finally {
        this.isSaving = false
      }
    },
  },
})