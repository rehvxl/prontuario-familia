import { DEPENDENCY_KEYS, useDependency } from '@/shared/lib';
import type { MemberRepository } from '../domain/member';

export const useMemberRepository = () => useDependency<MemberRepository>(DEPENDENCY_KEYS.members);
