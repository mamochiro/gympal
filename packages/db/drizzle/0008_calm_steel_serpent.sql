CREATE INDEX "idx_prs_workout_set_id" ON "personal_records" USING btree ("workout_set_id");--> statement-breakpoint
CREATE INDEX "idx_workout_sets_workout_exercise" ON "workout_sets" USING btree ("workout_id","exercise_id");--> statement-breakpoint
CREATE INDEX "idx_workouts_user_completed" ON "workouts" USING btree ("user_id","completed_at");